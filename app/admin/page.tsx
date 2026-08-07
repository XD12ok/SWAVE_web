"use client";

import { useCallback, useEffect, useState } from "react";
import { OrderStatus } from "@/types/enums";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

interface Stats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  todayPickups: number;
  todayDeliveries: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const allOrders = await fetch("/api/orders?limit=1000", {
        cache: "no-store",
      }).then((r) =>
        r.json(),
      );
        const orders: Array<{
          status: string;
          total: number;
          updatedAt: string;
        }> = allOrders.orders || [];

        const totalOrders = orders.length;
        const pendingOrders = orders.filter(
          (o) => o.status === OrderStatus.PENDING_PAYMENT,
        ).length;
        const completedOrders = orders.filter(
          (o) => o.status === OrderStatus.COMPLETED,
        ).length;
        const totalRevenue = orders
          .filter((o) => o.status === OrderStatus.COMPLETED)
          .reduce((sum, o) => sum + (o.total || 0), 0);
        const todayPickups = orders.filter(
          (o) =>
            o.status === OrderStatus.READY_FOR_PICKUP &&
            new Date(o.updatedAt).toDateString() === new Date().toDateString(),
        ).length;
        const todayDeliveries = orders.filter(
          (o) =>
            o.status === OrderStatus.SHIPPED &&
            new Date(o.updatedAt).toDateString() === new Date().toDateString(),
        ).length;

        setStats({
          totalOrders,
          pendingOrders,
          completedOrders,
          totalRevenue,
          todayPickups,
          todayDeliveries,
        });
      } catch (err) {
        console.error("Failed to load stats:", err);
      } finally {
        setLoading(false);
      }
  }, []);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const cards = [
    { label: "Total Orders", value: stats?.totalOrders ?? 0 },
    { label: "Pending Orders", value: stats?.pendingOrders ?? 0 },
    { label: "Completed Orders", value: stats?.completedOrders ?? 0 },
    {
      label: "Total Revenue",
      value: `Rp${(stats?.totalRevenue ?? 0).toLocaleString("id-ID")}`,
    },
    { label: "Today Pickups", value: stats?.todayPickups ?? 0 },
    { label: "Today Deliveries", value: stats?.todayDeliveries ?? 0 },
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Dashboard Overview</h1>
        <button
          onClick={handleRefresh}
          aria-label="Refresh"
          title="Refresh"
          className="h-10 w-10 shrink-0 rounded-full border border-white/20 flex items-center justify-center text-neutral-400 hover:text-white hover:border-white/40 transition-colors self-start"
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
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white/[0.03] border border-white/10 rounded-2xl p-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">
              {card.label}
            </p>
            <p className="text-3xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
