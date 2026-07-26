import { connectDB } from "@/lib/mongodb";
import OrderModel from "@/models/Order";
import CounterModel from "@/models/Counter";
import { IOrder } from "@/models/Order";
import { OrderStatus } from "@/types/enums";
import { reserveStock, consumeReservations, releaseReservations } from "./inventory.service";
import { Types } from "mongoose";
import { syncOrder } from "@/lib/sync-sheets";
import { sendInvoiceEmail } from "./email.service";

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

  const order = await OrderModel.create({
    ...data,
    invoiceNumber,
    status: OrderStatus.PENDING_PAYMENT,
  });

  try {
    const items = data.items.map((item) => ({
      charmId: item.charmId,
      qty: item.qty,
    }));

    await reserveStock(order._id as Types.ObjectId, items);
  } catch (err) {
    await OrderModel.findByIdAndDelete(order._id);
    throw err;
  }

  void syncOrder(JSON.parse(JSON.stringify(order)));

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

export async function getOrders(filters?: {
  status?: OrderStatus;
  limit?: number;
  offset?: number;
}) {
  await connectDB();

  const query: Record<string, unknown> = {};

  if (filters?.status) {
    query.status = filters.status;
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

  const order = await OrderModel.findByIdAndUpdate(id, { status }, { new: true }).lean();

  if (status === OrderStatus.PAID && previousStatus !== OrderStatus.PAID) {
    await consumeReservations(id);
  }

  if (status === OrderStatus.CANCELLED || status === OrderStatus.EXPIRED) {
    await releaseReservations(id);
  }

  if (order) void syncOrder(JSON.parse(JSON.stringify(order)));

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

  const update: Record<string, unknown> = {};

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
      await consumeReservations(id);
    }

    if (paymentData.status === "FAILED" || paymentData.status === "REFUNDED") {
      await releaseReservations(id);
    }
  }

  if (paymentData.paidAt) {
    update["payment.paidAt"] = paymentData.paidAt;
  }

  const updated = await OrderModel.findByIdAndUpdate(id, { $set: update }, { new: true }).lean();

  if (updated) void syncOrder(JSON.parse(JSON.stringify(updated)));

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
