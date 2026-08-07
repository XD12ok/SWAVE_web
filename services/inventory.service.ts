import { connectDB } from "@/lib/mongodb";
import CharmModel from "@/models/Charm";
import OrderModel from "@/models/Order";
import InventoryLogModel from "@/models/InventoryLog";
import InventoryReservationModel from "@/models/InventoryReservation";
import { InventoryReason, OrderStatus, ReservationStatus } from "@/types/enums";
import { Types } from "mongoose";
import { syncInventoryLog, syncOrder } from "@/lib/sync-sheets";
import { EventChannels, publish } from "@/lib/events";
import { ICharm } from "@/models/Charm";

const RESERVATION_TTL_MS = 30 * 60 * 1000;

export type StockDeductMode =
  | "reserve"
  | "release"
  | "consume"
  | "consume-reserved";

/**
 * Single atomic gate for ALL stock movements.
 * Every branch uses findOneAndUpdate + $expr so concurrent requests can never
 * oversell: if the guard condition fails, the update matches nothing and we
 * return null.
 */
export async function deductStockAtomic(
  charmId: string | Types.ObjectId,
  qty: number,
  mode: StockDeductMode,
): Promise<ICharm | null> {
  await connectDB();

  const where: Record<string, unknown> = { _id: charmId };
  let update: Record<string, unknown>;

  switch (mode) {
    case "reserve":
      // online order: hold units without removing physical stock
      where.$expr = { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, qty] };
      update = { $inc: { reservedStock: qty } };
      break;
    case "release":
      where.$expr = { $gte: ["$reservedStock", qty] };
      update = { $inc: { reservedStock: -qty } };
      break;
    case "consume-reserved":
      // fulfill a previously reserved unit (paid online order)
      where.$expr = {
        $and: [{ $gte: ["$stock", qty] }, { $gte: ["$reservedStock", qty] }],
      };
      update = { $inc: { stock: -qty, reservedStock: -qty, totalSold: qty } };
      break;
    case "consume":
    default:
      // direct sale (kasir): must not touch units reserved by online orders
      where.$expr = { $gte: [{ $subtract: ["$stock", "$reservedStock"] }, qty] };
      update = { $inc: { stock: -qty, totalSold: qty } };
      break;
  }

  const charm = await CharmModel.findOneAndUpdate(where, update, { new: true });

  return charm ? ((charm as unknown) as ICharm) : null;
}

export async function runReservationExpiryIfNeeded() {
  await connectDB();
  const hasExpired = await InventoryReservationModel.exists({
    status: ReservationStatus.ACTIVE,
    expiresAt: { $lte: new Date() },
  });
  if (hasExpired) {
    await expireReservations();
  }
}

export async function checkAvailability(items: { charmId: string; qty: number }[]) {
  await connectDB();
  await runReservationExpiryIfNeeded();

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
  await runReservationExpiryIfNeeded();

  const reservations = [];

  for (const item of items) {
    const charm = await deductStockAtomic(item.charmId, item.qty, "reserve");

    if (!charm) {
      await releaseReservations(orderId.toString());
      throw new Error(`Insufficient stock for charm ${item.charmId}`);
    }

    const log = await InventoryLogModel.create({
      charmId: item.charmId,
      before: (charm.stock ?? 0) - (charm.reservedStock ?? 0) + item.qty,
      after: (charm.stock ?? 0) - (charm.reservedStock ?? 0),
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
    status: {
      $in: [
        ReservationStatus.ACTIVE,
        ReservationStatus.EXPIRED,
        ReservationStatus.RELEASED,
      ],
    },
  });

  // Safety net: if this order has NO reservation documents at all (e.g. a legacy
  // TTL index already deleted them), rebuild the consumption from the order's
  // items so a paid order still decrements physical stock exactly once.
  // CONSUMED documents exist for already-paid orders, so this never runs twice.
  const hasAnyReservation = await InventoryReservationModel.exists({ orderId });
  if (!hasAnyReservation) {
    const order = await OrderModel.findById(orderId).select("items").lean();
    if (order && order.items.length > 0) {
      for (const item of order.items) {
        const charm = await deductStockAtomic(
          String(item.charmId),
          item.qty,
          "consume-reserved",
        );
        if (!charm) {
          throw new Error(
            `Stok tidak cukup untuk memproses pembayaran order ${orderId}`,
          );
        }
        const log = await InventoryLogModel.create({
          charmId: item.charmId,
          before: (charm.stock ?? 0) + item.qty,
          after: charm.stock ?? 0,
          change: -item.qty,
          reason: InventoryReason.ORDER,
          reference: orderId,
        });
        void syncInventoryLog(JSON.parse(JSON.stringify(log)));
      }
    }
    publish(EventChannels.CHARM_UPDATED, { reason: "order-paid" });
    return;
  }

  for (const reservation of reservations) {
    const wasReleased = reservation.status !== ReservationStatus.ACTIVE;

    // pay-after-expired: reservation was released, re-reserve atomically or fail
    if (wasReleased) {
      const reserved = await deductStockAtomic(
        reservation.charmId,
        reservation.qty,
        "reserve",
      );
      if (!reserved) {
        throw new Error(
          `Stok tidak cukup untuk memproses pembayaran order ${orderId}`,
        );
      }
    }

    const charm = await deductStockAtomic(
      reservation.charmId,
      reservation.qty,
      "consume-reserved",
    );

    if (!charm) {
      throw new Error(
        `Reservasi tidak dapat diproses untuk charm ${reservation.charmId}`,
      );
    }

    const log = await InventoryLogModel.create({
      charmId: reservation.charmId,
      before: (charm.stock ?? 0) + reservation.qty,
      after: charm.stock ?? 0,
      change: -reservation.qty,
      reason: InventoryReason.ORDER,
      reference: orderId,
    });
    void syncInventoryLog(JSON.parse(JSON.stringify(log)));

    reservation.status = ReservationStatus.CONSUMED;
    await reservation.save();
  }

  if (reservations.length > 0) {
    publish(EventChannels.CHARM_UPDATED, { reason: "order-paid" });
  }
}

export async function releaseReservations(orderId: string) {
  await connectDB();

  const reservations = await InventoryReservationModel.find({
    orderId,
    status: ReservationStatus.ACTIVE,
  });

  for (const reservation of reservations) {
    const charm = await deductStockAtomic(reservation.charmId, reservation.qty, "release");

    if (charm) {
      const log = await InventoryLogModel.create({
        charmId: reservation.charmId,
        before: (charm.reservedStock ?? 0) + reservation.qty,
        after: charm.reservedStock ?? 0,
        change: reservation.qty,
        reason: InventoryReason.ORDER,
        reference: `release:${orderId}`,
      });
      void syncInventoryLog(JSON.parse(JSON.stringify(log)));
    }

    reservation.status = ReservationStatus.RELEASED;
    await reservation.save();
  }

  if (reservations.length > 0) {
    publish(EventChannels.CHARM_UPDATED, { reason: "order-released" });
  }
}

export async function expireReservations() {
  await connectDB();

  const expired = await InventoryReservationModel.find({
    status: ReservationStatus.ACTIVE,
    expiresAt: { $lte: new Date() },
  });

  const orderIds = new Set<string>();
  const affectedCharmIds = new Set<string>();
  let released = 0;

  for (const reservation of expired) {
    const charm = await deductStockAtomic(reservation.charmId, reservation.qty, "release");

    if (charm) {
      const log = await InventoryLogModel.create({
        charmId: reservation.charmId,
        before: (charm.reservedStock ?? 0) + reservation.qty,
        after: charm.reservedStock ?? 0,
        change: reservation.qty,
        reason: InventoryReason.EXPIRED,
        reference: `expire:${reservation.orderId}`,
      });
      void syncInventoryLog(JSON.parse(JSON.stringify(log)));
    }

    reservation.status = ReservationStatus.EXPIRED;
    await reservation.save();
    released++;

    orderIds.add(String(reservation.orderId));
    affectedCharmIds.add(String(reservation.charmId));
  }

  for (const orderId of orderIds) {
    const order = await OrderModel.findOneAndUpdate(
      { _id: orderId, status: OrderStatus.PENDING_PAYMENT },
      { status: OrderStatus.EXPIRED },
      { new: true },
    ).lean();

    if (order) {
      void syncOrder(JSON.parse(JSON.stringify(order)));
      publish(EventChannels.orderStatus(orderId), {
        orderId,
        status: OrderStatus.EXPIRED,
        previousStatus: OrderStatus.PENDING_PAYMENT,
      });
      publish(EventChannels.ORDER_UPDATED, {
        orderId,
        status: OrderStatus.EXPIRED,
      });
    }
  }

  if (affectedCharmIds.size > 0) {
    publish(EventChannels.CHARM_UPDATED, { reason: "reservation-expired" });
  }

  return released;
}

export async function getCharmStock(charmId: string) {
  await connectDB();
  await runReservationExpiryIfNeeded();

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
  await runReservationExpiryIfNeeded();

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
