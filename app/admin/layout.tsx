"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ADMIN_PASSWORD = "swave123";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const pathname = usePathname();

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
          className="flex flex-col items-center gap-6"
        >
          <h1 className="text-2xl font-bold tracking-wider">SWAVE Admin</h1>
          <input
            type="password"
            placeholder="Enter admin password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-72 h-12 rounded-xl bg-white/[0.05] border border-white/10 px-5 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30 text-center"
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
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/10 min-h-screen p-6 flex flex-col">
        <Link href="/admin" className="text-xl font-serif tracking-wider text-white/80 hover:text-white mb-10 transition-colors">
          SWAVE
        </Link>
        <nav className="space-y-1 flex-1">
          <SidebarLink href="/admin" active={pathname === "/admin"}>
            Overview
          </SidebarLink>
          <SidebarLink href="/admin/orders" active={pathname.startsWith("/admin/orders")}>
            Orders
          </SidebarLink>
          <SidebarLink href="/admin/inventory" active={pathname === "/admin/inventory"}>
            Inventory
          </SidebarLink>
          <SidebarLink href="/admin/inventory/logs" active={pathname.startsWith("/admin/inventory/logs")}>
            Inventory Logs
          </SidebarLink>
          <SidebarLink href="/admin/charms" active={pathname.startsWith("/admin/charms")}>
            Charms
          </SidebarLink>
          <SidebarLink href="/admin/categories" active={pathname.startsWith("/admin/categories")}>
            Categories
          </SidebarLink>
        </nav>
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
        </div>
        <Link
          href="/welcome"
          className="text-sm text-neutral-500 hover:text-white transition-colors"
        >
          ← Back to Site
        </Link>
      </aside>

      {/* Content */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function SidebarLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
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
