import { connectDB } from "@/lib/mongodb";
import CharmModel from "@/models/Charm";
import InventoryLogModel from "@/models/InventoryLog";
import InventoryReservationModel from "@/models/InventoryReservation";
import { InventoryReason, ReservationStatus } from "@/types/enums";
import { Types } from "mongoose";
import { syncInventoryLog } from "@/lib/sync-sheets";

const RESERVATION_TTL_MS = 30 * 60 * 1000;

export async function checkAvailability(items: { charmId: string; qty: number }[]) {
  await connectDB();

  const results: Array<{ charmId: string; name: string; available: number; enough: boolean }> = [];

  for (const item of items) {
    const charm = await CharmModel.findById(item.charmId).select("name stock reservedStock").lean();

    if (!charm) {
      throw new Error(`Charm ${item.charmId} not found`);
    }

    const available = (charm.stock ?? 0) - (charm.reservedStock ?? 0);
    results.push({
      charmId: item.charmId,
      name: charm.name,
      available: Math.max(0, available),
      enough: available >= item.qty,
    });
  }

  return results;
}

export async function reserveStock(
  orderId: Types.ObjectId,
  items: { charmId: string; qty: number }[],
) {
  await connectDB();

  const reservations = [];

  for (const item of items) {
    const charm = await CharmModel.findOneAndUpdate(
      {
        _id: item.charmId,
        $expr: { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, item.qty] },
      },
      { $inc: { reservedStock: item.qty } },
      { new: true },
    );

    if (!charm) {
      await releaseReservations(orderId.toString());
      throw new Error(`Insufficient stock for charm ${item.charmId}`);
    }

    const log = await InventoryLogModel.create({
      charmId: item.charmId,
      before: charm.stock - charm.reservedStock + item.qty,
      after: charm.stock - charm.reservedStock,
      change: -item.qty,
      reason: InventoryReason.ORDER,
      reference: `reserve:${orderId}`,
    });
    void syncInventoryLog(JSON.parse(JSON.stringify(log)));

    const reservation = await InventoryReservationModel.create({
      orderId,
      charmId: item.charmId,
      qty: item.qty,
      expiresAt: new Date(Date.now() + RESERVATION_TTL_MS),
      status: ReservationStatus.ACTIVE,
    });

    reservations.push(reservation);
  }

  return reservations;
}

export async function consumeReservations(orderId: string) {
  await connectDB();

  const reservations = await InventoryReservationModel.find({
    orderId,
    status: ReservationStatus.ACTIVE,
  });

  for (const reservation of reservations) {
    const charm = await CharmModel.findById(reservation.charmId);

    if (charm) {
      const beforeStock = charm.stock;

      charm.stock = Math.max(0, charm.stock - reservation.qty);
      charm.reservedStock = Math.max(0, charm.reservedStock - reservation.qty);
      charm.totalSold = (charm.totalSold ?? 0) + reservation.qty;
      await charm.save();

      const log = await InventoryLogModel.create({
        charmId: reservation.charmId,
        before: beforeStock,
        after: charm.stock,
        change: -reservation.qty,
        reason: InventoryReason.ORDER,
        reference: orderId,
      });
      void syncInventoryLog(JSON.parse(JSON.stringify(log)));
    }

    reservation.status = ReservationStatus.CONSUMED;
    await reservation.save();
  }
}

export async function releaseReservations(orderId: string) {
  await connectDB();

  const reservations = await InventoryReservationModel.find({
    orderId,
    status: ReservationStatus.ACTIVE,
  });

  for (const reservation of reservations) {
    const charm = await CharmModel.findById(reservation.charmId);

    if (charm) {
      charm.reservedStock = Math.max(0, charm.reservedStock - reservation.qty);
      await charm.save();

      const log = await InventoryLogModel.create({
        charmId: reservation.charmId,
        before: charm.reservedStock + reservation.qty,
        after: charm.reservedStock,
        change: reservation.qty,
        reason: InventoryReason.ORDER,
        reference: `release:${orderId}`,
      });
      void syncInventoryLog(JSON.parse(JSON.stringify(log)));
    }

    reservation.status = ReservationStatus.RELEASED;
    await reservation.save();
  }
}

export async function expireReservations() {
  await connectDB();

  const expired = await InventoryReservationModel.find({
    status: ReservationStatus.ACTIVE,
    expiresAt: { $lte: new Date() },
  });

  let released = 0;

  for (const reservation of expired) {
    const charm = await CharmModel.findById(reservation.charmId);

    if (charm) {
      charm.reservedStock = Math.max(0, charm.reservedStock - reservation.qty);
      await charm.save();
    }

    reservation.status = ReservationStatus.EXPIRED;
    await reservation.save();
    released++;
  }

  return released;
}

export async function getCharmStock(charmId: string) {
  await connectDB();

  const charm = await CharmModel.findById(charmId).select("name stock reservedStock").lean();

  if (!charm) {
    throw new Error("Charm not found");
  }

  return {
    stock: charm.stock ?? 0,
    reservedStock: charm.reservedStock ?? 0,
    available: Math.max(0, (charm.stock ?? 0) - (charm.reservedStock ?? 0)),
  };
}

export async function getAllCharmStock() {
  await connectDB();

  const charms = await CharmModel.find({})
    .select("name stock reservedStock totalSold slug active")
    .lean();

  return charms.map((c) => ({
    _id: c._id,
    name: c.name,
    slug: c.slug,
    active: c.active,
    stock: c.stock ?? 0,
    reservedStock: c.reservedStock ?? 0,
    totalSold: c.totalSold ?? 0,
    available: Math.max(0, (c.stock ?? 0) - (c.reservedStock ?? 0)),
    lowStock: (c.stock ?? 0) - (c.reservedStock ?? 0) > 0 && (c.stock ?? 0) - (c.reservedStock ?? 0) <= 5,
    outOfStock: (c.stock ?? 0) - (c.reservedStock ?? 0) <= 0,
  }));
}
