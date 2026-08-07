import { connectDB } from "@/lib/mongodb";
import OrderModel from "@/models/Order";
import CounterModel from "@/models/Counter";
import CharmModel from "@/models/Charm";
import InventoryLogModel from "@/models/InventoryLog";
import { IOrder } from "@/models/Order";
import { OrderStatus, PaymentStatus, ShippingMethod, InventoryReason } from "@/types/enums";
import {
  reserveStock,
  consumeReservations,
  releaseReservations,
  deductStockAtomic,
} from "./inventory.service";
import { Types } from "mongoose";
import { syncOrder, syncInventoryLog } from "@/lib/sync-sheets";
import { sendInvoiceEmail } from "./email.service";
import { getDiscountedPrice } from "@/lib/discount";
import { EventChannels, publish } from "@/lib/events";

function generateInvoiceNumber(seq: number): string {
  const now = new Date();
  const date =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  const sequence = String(seq).padStart(4, "0");
  return `SWV-${date}-${sequence}`;
}

export async function createOrder(data: Omit<IOrder, "invoiceNumber" | "status" | "createdAt" | "updatedAt">) {
  await connectDB();

  const counter = await CounterModel.findOneAndUpdate(
    { name: "orders" },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true },
  );

  const invoiceNumber = generateInvoiceNumber(counter.sequence);

  const charmDocs = await CharmModel.find({
    _id: { $in: data.items.map((i) => i.charmId) },
  }).lean();

  const charmMap = new Map(
    charmDocs.map((c) => [String(c._id), c]),
  );

  const items = data.items.map((item) => {
    const charm = charmMap.get(String(item.charmId));
    if (!charm) {
      throw new Error(`Charm tidak ditemukan: ${item.charmId}`);
    }
    const price = getDiscountedPrice(charm.price, charm.discount);
    const subtotal = price * item.qty;
    return {
      charmId: item.charmId,
      name: charm.name,
      price,
      qty: item.qty,
      subtotal,
    };
  });

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal + (data.shippingCost ?? 0);

  const order = await OrderModel.create({
    ...data,
    items,
    subtotal,
    total,
    invoiceNumber,
    status: OrderStatus.PENDING_PAYMENT,
    source: "ONLINE",
  });

  try {
    await reserveStock(
      order._id as Types.ObjectId,
      items.map((item) => ({ charmId: item.charmId, qty: item.qty })),
    );
  } catch (err) {
    await OrderModel.findByIdAndDelete(order._id);
    throw err;
  }

  void syncOrder(JSON.parse(JSON.stringify(order)));

  publish(EventChannels.ORDER_CREATED, {
    orderId: String(order._id),
    invoiceNumber: order.invoiceNumber,
    status: order.status,
  });
  publish(EventChannels.ORDER_UPDATED, {
    orderId: String(order._id),
    invoiceNumber: order.invoiceNumber,
    status: order.status,
  });

  void sendInvoiceEmail({
    invoiceNumber: order.invoiceNumber,
    buyerName: order.buyer.name,
    buyerEmail: order.buyer.email,
    items: order.items.map((i) => ({
      name: i.name,
      price: i.price,
      qty: i.qty,
      subtotal: i.subtotal,
    })),
    subtotal: order.subtotal,
    shippingCost: order.shippingCost,
    total: order.total,
    shippingMethod: order.shipping.method,
  });

  return order;
}

export async function createCashierOrder(
  items: { charmId: string; qty: number }[],
  paymentMethod: "CASH" | "QRIS",
  opts?: { cashierName?: string; buyerName?: string },
) {
  await connectDB();

  if (!items.length) {
    throw new Error("Tidak ada item di keranjang");
  }

  if (paymentMethod !== "CASH" && paymentMethod !== "QRIS") {
    throw new Error("Metode pembayaran tidak valid");
  }

  const buyerName = opts?.buyerName?.trim() || "Walk-in";

  const counter = await CounterModel.findOneAndUpdate(
    { name: "orders" },
    { $inc: { sequence: 1 } },
    { upsert: true, new: true },
  );

  const invoiceNumber = generateInvoiceNumber(counter.sequence);

  const charmDocs = await CharmModel.find({
    _id: { $in: items.map((i) => i.charmId) },
  }).lean();

  const charmMap = new Map(charmDocs.map((c) => [String(c._id), c]));

  const lineItems = items.map((item) => {
    const charm = charmMap.get(String(item.charmId));
    if (!charm) {
      throw new Error(`Charm tidak ditemukan: ${item.charmId}`);
    }
    const price = getDiscountedPrice(charm.price, charm.discount);
    return {
      charmId: String(charm._id),
      name: charm.name,
      image: charm.image,
      price,
      qty: item.qty,
      subtotal: price * item.qty,
    };
  });

  const subtotal = lineItems.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal;

  // Atomic consume with full rollback on any shortfall -> no oversell at booth
  const consumed: { charmId: string; qty: number }[] = [];

  for (const item of lineItems) {
    const charm = await deductStockAtomic(item.charmId, item.qty, "consume");

    if (!charm) {
      await Promise.all(
        consumed.map((c) =>
          CharmModel.updateOne(
            { _id: c.charmId },
            { $inc: { stock: c.qty, totalSold: -c.qty } },
          ),
        ),
      );
      throw new Error(`Stok tidak cukup: ${item.name}`);
    }

    consumed.push({ charmId: item.charmId, qty: item.qty });

    const log = await InventoryLogModel.create({
      charmId: item.charmId,
      before: (charm.stock ?? 0) + item.qty,
      after: charm.stock ?? 0,
      change: -item.qty,
      reason: InventoryReason.ORDER,
      reference: `kasir:${invoiceNumber}`,
    });
    void syncInventoryLog(JSON.parse(JSON.stringify(log)));
  }

  const order = await OrderModel.create({
    invoiceNumber,
    buyer: { name: buyerName, email: "walkin@swave.local", phone: "-" },
    shipping: { method: ShippingMethod.PICKUP, receiverName: buyerName },
    items: lineItems,
    payment: {
      method: paymentMethod,
      status: PaymentStatus.PAID,
      paidAt: new Date(),
      confirmedAt: new Date(),
    },
    status: OrderStatus.COMPLETED,
    subtotal,
    shippingCost: 0,
    total,
    source: "CASHIER",
    cashierName: opts?.cashierName?.trim() || undefined,
  });

  void syncOrder(JSON.parse(JSON.stringify(order)));

  publish(EventChannels.ORDER_CREATED, {
    orderId: String(order._id),
    invoiceNumber: order.invoiceNumber,
    status: order.status,
  });
  publish(EventChannels.ORDER_UPDATED, {
    orderId: String(order._id),
    invoiceNumber: order.invoiceNumber,
    status: order.status,
  });
  publish(EventChannels.CHARM_UPDATED, { reason: "kasir-sale" });

  return order;
}

export async function getOrders(filters?: {
  status?: OrderStatus;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  await connectDB();

  const query: Record<string, unknown> = {};

  if (filters?.status) {
    query.status = filters.status;
  }

  if (filters?.search?.trim()) {
    const q = filters.search.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "i");
    query.$or = [
      { "buyer.name": regex },
      { invoiceNumber: regex },
      { "buyer.email": regex },
    ];
  }

  const total = await OrderModel.countDocuments(query);

  const orders = await OrderModel.find(query)
    .sort({ createdAt: -1 })
    .skip(filters?.offset ?? 0)
    .limit(filters?.limit ?? 50)
    .lean();

  return { orders, total };
}

export async function getOrderById(id: string) {
  await connectDB();
  return OrderModel.findById(id).lean();
}

export async function getOrderByInvoice(invoice: string) {
  await connectDB();
  return OrderModel.findOne({ invoiceNumber: invoice }).lean();
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  await connectDB();

  const current = await OrderModel.findById(id);
  if (!current) throw new Error("Order not found");

  const previousStatus: string = current.status;

  if (
    previousStatus === OrderStatus.CANCELLED ||
    previousStatus === OrderStatus.COMPLETED ||
    previousStatus === OrderStatus.EXPIRED
  ) {
    throw new Error("Cannot update a finalized order");
  }

  if (status === OrderStatus.PAID && previousStatus !== OrderStatus.PAID) {
    await consumeReservations(id);
  }

  if (status === OrderStatus.CANCELLED || status === OrderStatus.EXPIRED) {
    await releaseReservations(id);
  }

  const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true }).lean();

  if (order) {
    void syncOrder(JSON.parse(JSON.stringify(order)));
    publish(EventChannels.orderStatus(id), {
      orderId: id,
      status,
      previousStatus,
    });
    publish(EventChannels.ORDER_UPDATED, {
      orderId: id,
      status,
      previousStatus,
    });
  }

  return order;
}

export async function updateOrderPayment(
  id: string,
  paymentData: {
    method?: string;
    proofImage?: { publicId: string; secureUrl: string };
    status?: string;
    paidAt?: Date;
  },
) {
  await connectDB();

  const current = await OrderModel.findById(id);
  if (!current) throw new Error("Order not found");

  if (
    current.status === OrderStatus.CANCELLED ||
    current.status === OrderStatus.COMPLETED
  ) {
    throw new Error("Cannot process payment for a finalized order");
  }

  const update: Record<string, unknown> = {};
  let reviveOrder = false;

  if (paymentData.method) {
    update["payment.method"] = paymentData.method;
  }

  if (paymentData.proofImage) {
    update["payment.proofImage"] = paymentData.proofImage;
    update["payment.status"] = "WAITING_CONFIRMATION";
  }

  if (paymentData.status) {
    update["payment.status"] = paymentData.status;

    if (paymentData.status === "PAID") {
      // re-reserves if the reservation expired; throws if stock ran out.
      // skip if already marked paid to avoid double consumption.
      if (current.payment.status !== PaymentStatus.PAID) {
        await consumeReservations(id);
      }
      if (current.status === OrderStatus.EXPIRED) {
        reviveOrder = true;
      }
    }

    if (paymentData.status === "FAILED" || paymentData.status === "REFUNDED") {
      await releaseReservations(id);
    }
  }

  if (paymentData.paidAt) {
    update["payment.paidAt"] = paymentData.paidAt;
  }

  if (reviveOrder) {
    update["status"] = OrderStatus.PAID;
  }

  const updated = await OrderModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();

  if (updated) {
    void syncOrder(JSON.parse(JSON.stringify(updated)));
    publish(EventChannels.orderPayment(id), {
      orderId: id,
      paymentStatus: update["payment.status"],
    });
    publish(EventChannels.ORDER_UPDATED, {
      orderId: id,
      status: reviveOrder ? OrderStatus.PAID : undefined,
    });
  }

  return updated;
}

export async function getDashboardStats() {
  await connectDB();

  const [totalOrders, pendingOrders, completedOrders, totalRevenue] =
    await Promise.all([
      OrderModel.countDocuments(),
      OrderModel.countDocuments({ status: OrderStatus.PENDING_PAYMENT }),
      OrderModel.countDocuments({ status: OrderStatus.COMPLETED }),
      OrderModel.aggregate([
        { $match: { status: OrderStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const [todayPickups, todayDeliveries] = await Promise.all([
    OrderModel.countDocuments({
      status: OrderStatus.READY_FOR_PICKUP,
      updatedAt: { $gte: todayStart, $lte: todayEnd },
    }),
    OrderModel.countDocuments({
      status: OrderStatus.SHIPPED,
      updatedAt: { $gte: todayStart, $lte: todayEnd },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    completedOrders,
    totalRevenue: totalRevenue[0]?.total ?? 0,
    todayPickups,
    todayDeliveries,
  };
}

export async function getAdminAlerts() {
  await connectDB();

  const overdueThreshold = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);

  const [newOrders, overdueOrders] = await Promise.all([
    OrderModel.find({ status: OrderStatus.PENDING_PAYMENT })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean(),
    OrderModel.find({
      status: { $in: [OrderStatus.PENDING_PAYMENT, OrderStatus.PAID] },
      updatedAt: { $lte: overdueThreshold },
    })
      .sort({ updatedAt: 1 })
      .limit(20)
      .lean(),
  ]);

  const pick = (o: IOrder) => ({
    _id: String(o._id),
    invoiceNumber: o.invoiceNumber,
    buyerName: o.buyer?.name ?? "-",
    status: o.status,
    total: o.total ?? 0,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
  });

  return {
    newOrders: newOrders.map(pick),
    overdueOrders: overdueOrders.map(pick),
  };
}
