"use client";

import { useCallback, useEffect, useState } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

interface CharmStock {
  _id: string;
  name: string;
  slug: string;
  active: boolean;
  stock: number;
  reservedStock: number;
  totalSold: number;
  available: number;
  lowStock: boolean;
  outOfStock: boolean;
}

export default function AdminInventory() {
  const [items, setItems] = useState<CharmStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [editing, setEditing] = useState<string | null>(null);
  const [editStock, setEditStock] = useState("");
  const [editReserved, setEditReserved] = useState("");
  const [editAvailable, setEditAvailable] = useState("");
  const [editSold, setEditSold] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch("/api/inventory", { cache: "no-store" });
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error("Failed to load inventory:", err);
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
    [EventChannels.CHARM_UPDATED],
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

  const startEdit = (item: CharmStock) => {
    setEditing(item._id);
    setEditStock(String(item.stock));
    setEditReserved(String(item.reservedStock));
    setEditAvailable(String(item.available));
    setEditSold(String(item.totalSold));
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleEditStock = (val: string) => {
    setEditStock(val);
    setEditAvailable(String(Math.max(0, (Number(val) || 0) - (Number(editReserved) || 0))));
  };

  const handleEditReserved = (val: string) => {
    setEditReserved(val);
    setEditAvailable(String(Math.max(0, (Number(editStock) || 0) - (Number(val) || 0))));
  };

  const handleEditAvailable = (val: string) => {
    setEditAvailable(val);
    setEditStock(String((Number(val) || 0) + (Number(editReserved) || 0)));
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/charms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: Number(editStock) || 0,
          reservedStock: Number(editReserved) || 0,
          totalSold: Number(editSold) || 0,
        }),
      });
      if (res.ok) {
        setEditing(null);
        load();
      }
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  const filteredItems = items.filter((item) => {
    if (!searchQuery) return true;
    return item.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  if (filteredItems.length === 0) {
    return (
      <div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <h1 className="text-2xl font-bold">Inventory</h1>
          <div className="flex gap-3 items-center">
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
              placeholder="Search charms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 flex-1 min-w-0"
            />
          </div>
        </div>
        <div className="text-center py-24 text-neutral-500">
          <p className="text-lg">{items.length === 0 ? "No inventory data yet" : "No items match your search"}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Inventory</h1>
        <div className="flex gap-3 items-center">
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
            placeholder="Search charms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 w-full md:w-64"
          />
        </div>
      </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead>
            <tr className="border-b border-white/10 text-neutral-500">
              <th className="text-left px-6 py-4 font-medium">Charm</th>
              <th className="text-right px-6 py-4 font-medium">Physical Stock</th>
              <th className="text-right px-6 py-4 font-medium">Reserved</th>
              <th className="text-right px-6 py-4 font-medium">Available</th>
              <th className="text-right px-6 py-4 font-medium">Sold</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const isEditing = editing === item._id;

              return (
                <tr
                  key={item._id}
                  className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                    item.outOfStock
                      ? "opacity-50"
                      : item.lowStock
                        ? "bg-amber-500/[0.03]"
                        : ""
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span>{item.name}</span>
                      {!item.active && (
                        <span className="text-[10px] text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">
                          Inactive
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="px-6 py-4 text-right font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editStock}
                        onChange={(e) => handleEditStock(e.target.value)}
                        className="w-20 h-8 rounded-lg bg-white/[0.08] border border-white/20 px-2 text-right text-sm outline-none focus:border-white/40"
                        min={0}
                      />
                    ) : (
                      item.stock
                    )}
                  </td>

                  <td className="px-6 py-4 text-right font-mono text-amber-400">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editReserved}
                        onChange={(e) => handleEditReserved(e.target.value)}
                        className="w-20 h-8 rounded-lg bg-white/[0.08] border border-white/20 px-2 text-right text-sm outline-none focus:border-white/40"
                        min={0}
                      />
                    ) : (
                      item.reservedStock
                    )}
                  </td>

                  <td className="px-6 py-4 text-right font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editAvailable}
                        onChange={(e) => handleEditAvailable(e.target.value)}
                        className="w-20 h-8 rounded-lg bg-white/[0.08] border border-white/20 px-2 text-right text-sm outline-none focus:border-white/40"
                        min={0}
                      />
                    ) : (
                      <span
                        className={
                          item.outOfStock
                            ? "text-red-400"
                            : item.lowStock
                              ? "text-amber-400"
                              : "text-green-400"
                        }
                      >
                        {item.available}
                      </span>
                    )}
                  </td>

                  <td className="px-6 py-4 text-right font-mono">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editSold}
                        onChange={(e) => setEditSold(e.target.value)}
                        className="w-20 h-8 rounded-lg bg-white/[0.08] border border-white/20 px-2 text-right text-sm outline-none focus:border-white/40"
                        min={0}
                      />
                    ) : (
                      item.totalSold
                    )}
                  </td>

                  <td className="px-6 py-4 text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => saveEdit(item._id)}
                          disabled={saving}
                          className="text-xs text-green-400 hover:text-green-300 transition-colors disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="text-xs text-neutral-500 hover:text-white transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(item)}
                        className="text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
