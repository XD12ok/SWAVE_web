"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OrderStatus } from "@/types/enums";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

interface Order {
  _id: string;
  invoiceNumber: string;
  buyer: { name: string; email: string; phone: string };
  items: Array<{ name: string; qty: number }>;
  status: OrderStatus;
  total: number;
  createdAt: string;
  payment: { status: string };
  source?: string;
  cashierName?: string;
  shipping?: { method?: string };
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
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSearchQuery(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const url = params.toString() ? `/api/orders?${params}` : "/api/orders";
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const silentReload = useCallback(() => {
    void load({ silent: true });
  }, [load]);

  useRealtime(
    [EventChannels.ORDER_UPDATED],
    {
      intervalMs: 10000,
      onEvent: silentReload,
      onPoll: silentReload,
    },
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            aria-label="Refresh"
            title="Refresh"
            className="h-10 w-10 shrink-0 rounded-full border border-white/20 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/40 transition-colors"
          >
            {refreshing ? (
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
            )}
          </button>
          <input
            placeholder="Search buyer name, invoice or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 w-full min-w-0"
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
      ) : orders.length === 0 ? (
        <div className="text-center py-24 text-neutral-500">
          <p className="text-lg">{searchQuery || statusFilter ? "No orders match your search" : "No orders found"}</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
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
              {orders.map((order) => (
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
                    <span
                      className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        order.source === "CASHIER" ||
                        order.buyer.email === "walkin@swave.local"
                          ? "bg-purple-500/15 text-purple-400"
                          : "bg-blue-500/15 text-blue-400"
                      }`}
                    >
                      {order.source === "CASHIER" ||
                      order.buyer.email === "walkin@swave.local"
                        ? order.cashierName
                          ? `Kasir · ${order.cashierName}`
                          : "Kasir"
                        : `Online · ${
                            order.shipping?.method === "DELIVERY"
                              ? "Delivery"
                              : "Pickup"
                          }`}
                    </span>
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
