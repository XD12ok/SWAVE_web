"use client";

import { useEffect, useState } from "react";

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

  const [editing, setEditing] = useState<string | null>(null);
  const [editStock, setEditStock] = useState(0);
  const [editReserved, setEditReserved] = useState(0);
  const [editAvailable, setEditAvailable] = useState(0);
  const [editSold, setEditSold] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/inventory");
      if (res.ok) setItems(await res.json());
    } catch (err) {
      console.error("Failed to load inventory:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/inventory");
        if (res.ok && !cancelled) setItems(await res.json());
      } catch (err) {
        console.error("Failed to load inventory:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const startEdit = (item: CharmStock) => {
    setEditing(item._id);
    setEditStock(item.stock);
    setEditReserved(item.reservedStock);
    setEditAvailable(item.available);
    setEditSold(item.totalSold);
  };

  const cancelEdit = () => {
    setEditing(null);
  };

  const handleEditStock = (val: number) => {
    setEditStock(val);
    setEditAvailable(val - editReserved);
  };

  const handleEditReserved = (val: number) => {
    setEditReserved(val);
    setEditAvailable(editStock - val);
  };

  const handleEditAvailable = (val: number) => {
    setEditAvailable(val);
    setEditStock(val + editReserved);
  };

  const saveEdit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/charms/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stock: editStock,
          reservedStock: editReserved,
          totalSold: editSold,
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
          <input
            placeholder="Search charms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 flex-1 min-w-0"
          />
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
        <input
          placeholder="Search charms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 w-full md:w-64"
        />
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
                        onChange={(e) => handleEditStock(Number(e.target.value))}
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
                        onChange={(e) => handleEditReserved(Number(e.target.value))}
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
                        onChange={(e) => handleEditAvailable(Number(e.target.value))}
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
                        onChange={(e) => setEditSold(Number(e.target.value))}
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
