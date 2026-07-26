"use client";

import { useEffect, useState } from "react";
import { OrderStatus } from "@/types/enums";

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

  useEffect(() => {
    async function load() {
      try {
        const allOrders = await fetch("/api/orders?limit=1000").then((r) =>
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
    }
    load();
  }, []);

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
      <h1 className="text-2xl font-bold mb-8">Dashboard Overview</h1>
      <div className="grid grid-cols-3 gap-5">
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
