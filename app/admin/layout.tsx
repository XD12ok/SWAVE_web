"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

const ADMIN_PASSWORD = "swave123";
const ALERTS_SEEN_KEY = "swave-admin-alerts-seen";

interface AlertOrder {
  _id: string;
  invoiceNumber: string;
  buyerName: string;
  status: string;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const [alerts, setAlerts] = useState<{
    newOrders: AlertOrder[];
    overdueOrders: AlertOrder[];
  }>({ newOrders: [], overdueOrders: [] });
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [seenAt, setSeenAt] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return Number(localStorage.getItem(ALERTS_SEEN_KEY)) || 0;
  });

  const fetchAlerts = useCallback(async () => {
    if (!authenticated) return;
    try {
      const res = await fetch("/api/admin/alerts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setAlerts({
          newOrders: Array.isArray(data.newOrders) ? data.newOrders : [],
          overdueOrders: Array.isArray(data.overdueOrders)
            ? data.overdueOrders
            : [],
        });
      }
    } catch {
      // ignore
    }
  }, [authenticated]);

  useEffect(() => {
    if (!authenticated) return;
    (async () => {
      await fetchAlerts();
    })();
  }, [authenticated, fetchAlerts]);

  useRealtime([EventChannels.ORDER_CREATED, EventChannels.ORDER_UPDATED], {
    intervalMs: 15000,
    onEvent: () => void fetchAlerts(),
    onPoll: () => void fetchAlerts(),
  });

  const markSeen = () => {
    const now = Date.now();
    setSeenAt(now);
    localStorage.setItem(ALERTS_SEEN_KEY, String(now));
  };

  const unseenNew = alerts.newOrders.filter(
    (o) => new Date(o.createdAt).getTime() > seenAt,
  ).length;
  const badgeCount = unseenNew + alerts.overdueOrders.length;

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (password === ADMIN_PASSWORD) {
              setAuthenticated(true);
              setError("");
            } else {
              setError("Invalid password");
            }
          }}
          className="flex flex-col items-center gap-6 w-full max-w-sm"
        >
          <h1 className="text-2xl font-bold tracking-wider">SWAVE Admin</h1>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-5 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30 text-center"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            className="px-8 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-white/10 bg-black min-h-screen p-6 flex flex-col transition-transform md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-10">
          <Link
            href="/admin"
            className="text-xl font-serif tracking-wider text-white/80 hover:text-white transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            SWAVE
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-neutral-400 hover:text-white md:hidden text-lg"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>
        <nav className="space-y-1 flex-1">
          <SidebarLink
            href="/admin"
            active={pathname === "/admin"}
            onClick={() => setSidebarOpen(false)}
          >
            Overview
          </SidebarLink>
          <SidebarLink
            href="/admin/orders"
            active={pathname.startsWith("/admin/orders")}
            onClick={() => setSidebarOpen(false)}
          >
            Orders
          </SidebarLink>
          <SidebarLink
            href="/admin/kasir"
            active={pathname.startsWith("/admin/kasir")}
            onClick={() => setSidebarOpen(false)}
          >
            Kasir
          </SidebarLink>
          <SidebarLink
            href="/admin/inventory"
            active={pathname === "/admin/inventory"}
            onClick={() => setSidebarOpen(false)}
          >
            Inventory
          </SidebarLink>
          <SidebarLink
            href="/admin/inventory/logs"
            active={pathname.startsWith("/admin/inventory/logs")}
            onClick={() => setSidebarOpen(false)}
          >
            Inventory Logs
          </SidebarLink>
          <SidebarLink
            href="/admin/charms"
            active={pathname.startsWith("/admin/charms")}
            onClick={() => setSidebarOpen(false)}
          >
            Charms
          </SidebarLink>
          <SidebarLink
            href="/admin/categories"
            active={pathname.startsWith("/admin/categories")}
            onClick={() => setSidebarOpen(false)}
          >
            Categories
          </SidebarLink>
        </nav>
        <div className="mb-4">
          <NotificationBell
            alerts={alerts}
            badgeCount={badgeCount}
            open={alertsOpen}
            onToggle={() => setAlertsOpen((o) => !o)}
            onClose={() => setAlertsOpen(false)}
            onMarkSeen={markSeen}
            align="left"
          />
        </div>
        <div className="space-y-2">
          <a
            href="/api/seed"
            onClick={async (e) => {
              e.preventDefault();
              try {
                const res = await fetch("/api/seed", { method: "POST" });
                const data = await res.json();
                alert(
                  res.ok
                    ? `Seeded: ${JSON.stringify(data.seeded)}`
                    : `Error: ${data.error}`,
                );
              } catch {
                alert("Seed failed");
              }
            }}
            className="block w-full text-center px-4 py-2.5 rounded-xl text-sm border border-dashed border-white/20 text-neutral-400 hover:text-white hover:border-white/40 transition-colors"
          >
            Seed Database
          </a>
          <a
            href="/api/reset"
            onClick={async (e) => {
              e.preventDefault();
              if (!confirm("Reset DB? Charms & categories will be kept.")) return;
              try {
                const res = await fetch("/api/reset", { method: "POST" });
                const data = await res.json();
                alert(
                  res.ok
                    ? `Reset done: ${JSON.stringify(data.deleted)}`
                    : `Error: ${data.error}`,
                );
                if (res.ok) {
                  const seedRes = await fetch("/api/seed", { method: "POST" });
                  const seedData = await seedRes.json();
                  alert(
                    seedRes.ok
                      ? `Re-seeded: ${JSON.stringify(seedData.seeded)}`
                      : `Seed error: ${seedData.error}`,
                  );
                }
              } catch {
                alert("Reset failed");
              }
            }}
            className="block w-full text-center px-4 py-2.5 rounded-xl text-sm border border-dashed border-red-500/30 text-red-400/70 hover:text-red-400 hover:border-red-500/50 transition-colors"
          >
            Reset DB
          </a>
        </div>
        <Link
          href="/welcome"
          className="text-sm text-neutral-500 hover:text-white transition-colors mt-4"
        >
          ← Back to Site
        </Link>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 p-4 md:p-8 overflow-auto">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 mb-4 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-neutral-400 hover:text-white text-lg p-1"
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="text-sm font-medium text-white/60">SWAVE Admin</span>
          <div className="ml-auto">
            <NotificationBell
              alerts={alerts}
              badgeCount={badgeCount}
              open={alertsOpen}
              onToggle={() => setAlertsOpen((o) => !o)}
              onClose={() => setAlertsOpen(false)}
              onMarkSeen={markSeen}
              align="right"
            />
          </div>
        </div>
        {children}
      </main>
    </div>
  );
}

function SidebarLink({
  href,
  active,
  children,
  onClick,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`block px-4 py-3 rounded-xl text-sm transition-all ${
        active
          ? "bg-white text-black font-medium"
          : "text-neutral-400 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </Link>
  );
}

function NotificationBell({
  alerts,
  badgeCount,
  open,
  onToggle,
  onClose,
  onMarkSeen,
  align,
}: {
  alerts: { newOrders: AlertOrder[]; overdueOrders: AlertOrder[] };
  badgeCount: number;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onMarkSeen: () => void;
  align: "left" | "right";
}) {
  const empty = alerts.newOrders.length === 0 && alerts.overdueOrders.length === 0;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-11 h-11 rounded-xl border border-white/10 bg-white/[0.03] text-neutral-300 hover:text-white hover:bg-white/[0.06] transition-colors"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[11px] font-bold flex items-center justify-center">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute mt-2 w-80 max-h-[70vh] overflow-auto rounded-xl border border-white/10 bg-neutral-900 shadow-2xl p-3 space-y-4 z-50 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
              Notifikasi
            </p>
            <button
              onClick={onMarkSeen}
              className="text-[11px] text-neutral-400 hover:text-white transition-colors"
            >
              Tandai dibaca
            </button>
          </div>

          {empty && (
            <p className="text-sm text-neutral-500 py-4 text-center">
              Tidak ada notifikasi
            </p>
          )}

          {alerts.newOrders.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-400 mb-1.5">
                Pesanan Baru ({alerts.newOrders.length})
              </p>
              <div className="space-y-1">
                {alerts.newOrders.map((o) => (
                  <Link
                    key={o._id}
                    href={`/admin/orders/${o._id}`}
                    onClick={onClose}
                    className="block px-3 py-2 rounded-lg bg-white/[0.04] border border-white/5 hover:bg-white/[0.08] transition-colors"
                  >
                    <p className="text-xs font-mono text-white">
                      {o.invoiceNumber}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {o.buyerName} · Rp{o.total.toLocaleString("id-ID")} ·{" "}
                      {new Date(o.createdAt).toLocaleString("id-ID")}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {alerts.overdueOrders.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest text-red-400 mb-1.5">
                Belum Diproses &gt; 4 Hari ({alerts.overdueOrders.length})
              </p>
              <div className="space-y-1">
                {alerts.overdueOrders.map((o) => (
                  <Link
                    key={o._id}
                    href={`/admin/orders/${o._id}`}
                    onClick={onClose}
                    className="block px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    <p className="text-xs font-mono text-white">
                      {o.invoiceNumber}
                    </p>
                    <p className="text-[11px] text-neutral-400">
                      {o.buyerName} · Rp{o.total.toLocaleString("id-ID")}
                    </p>
                    <p className="text-[10px] text-red-400">
                      Diproses terakhir{" "}
                      {new Date(o.updatedAt).toLocaleString("id-ID")}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
