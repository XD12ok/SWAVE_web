"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OrderStatus } from "@/types/enums";

interface Order {
  _id: string;
  invoiceNumber: string;
  buyer: { name: string; email: string; phone: string };
  items: Array<{ name: string; qty: number }>;
  status: OrderStatus;
  total: number;
  createdAt: string;
  payment: { status: string };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for Pickup",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING_PAYMENT: "bg-yellow-500/20 text-yellow-400",
  PAID: "bg-blue-500/20 text-blue-400",
  PROCESSING: "bg-purple-500/20 text-purple-400",
  READY_FOR_PICKUP: "bg-cyan-500/20 text-cyan-400",
  SHIPPED: "bg-indigo-500/20 text-indigo-400",
  COMPLETED: "bg-green-500/20 text-green-400",
  CANCELLED: "bg-red-500/20 text-red-400",
  EXPIRED: "bg-neutral-500/20 text-neutral-400",
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const url = statusFilter
          ? `/api/orders?status=${statusFilter}`
          : "/api/orders";
        const res = await fetch(url);
        const data = await res.json();
        setOrders(data.orders || []);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [statusFilter]);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.invoiceNumber.toLowerCase().includes(q) ||
      o.buyer.name.toLowerCase().includes(q) ||
      o.buyer.email.toLowerCase().includes(q)
    );
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-3">
          <input
            placeholder="Search by invoice or buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setLoading(true);
            }}
            className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300"
          >
            <option value="">All Status</option>
            {Object.values(OrderStatus).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-24 text-neutral-500">
          <p className="text-lg">{orders.length === 0 ? "No orders found" : "No orders match your search"}</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-neutral-500">
                <th className="text-left px-6 py-4 font-medium">Invoice</th>
                <th className="text-left px-6 py-4 font-medium">Buyer</th>
                <th className="text-left px-6 py-4 font-medium">Status</th>
                <th className="text-left px-6 py-4 font-medium">Charms</th>
                <th className="text-right px-6 py-4 font-medium">Total</th>
                <th className="text-right px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order._id}
                  className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                >
                  <td className="px-6 py-4 font-mono text-xs">
                    {order.invoiceNumber}
                  </td>
                  <td className="px-6 py-4">
                    <p>{order.buyer.name}</p>
                    <p className="text-xs text-neutral-500">
                      {order.buyer.email}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                        STATUS_COLORS[order.status] ?? "bg-neutral-500/20 text-neutral-400"
                      }`}
                    >
                      {STATUS_LABELS[order.status] ?? order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-neutral-400 max-w-[200px] truncate">
                    {(() => {
                      const grouped = order.items.reduce(
                        (acc, i) => {
                          const key = i.name;
                          acc[key] = (acc[key] ?? 0) + i.qty;
                          return acc;
                        },
                        {} as Record<string, number>,
                      );
                      return Object.entries(grouped)
                        .map(([name, qty]) => name + (qty > 1 ? ` ×${qty}` : ""))
                        .join(", ");
                    })() || "—"}
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    Rp{order.total.toLocaleString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-right text-neutral-400 text-xs">
                    {new Date(order.createdAt).toLocaleDateString("id-ID")}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/admin/orders/${order._id}`}
                      className="text-xs text-neutral-400 hover:text-white transition-colors"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
