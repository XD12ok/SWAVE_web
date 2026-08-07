"use client";

import { useEffect, useState } from "react";
import { toSlug } from "@/lib/slug";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
}

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/categories", { cache: "no-store" });
        if (!cancelled && res.ok) {
          const data = await res.json();
          setCategories(Array.isArray(data) ? data : []);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const resetForm = () => {
    setName("");
    setEditing(null);
    setShowForm(false);
  };

  const reload = async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch {
      // ignore
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  };

  useRealtime(
    [EventChannels.CATEGORY_UPDATED, EventChannels.CHARM_UPDATED],
    {
      intervalMs: 10000,
      onEvent: () => void reload(),
      onPoll: () => void reload(),
    },
  );

  const openEdit = (cat: Category) => {
    setName(cat.name);
    setEditing(cat);
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const payload = { name: name.trim(), slug: toSlug(name) };
      const res = editing
        ? await fetch(`/api/categories/${editing._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (res.ok) {
        resetForm();
        reload();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to save");
      }
    } catch {
      alert("Failed to save category");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) reload();
    } catch {
      alert("Failed to delete");
    }
  };

  const filteredCategories = categories.filter((cat) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return cat.name.toLowerCase().includes(q);
  });

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Categories</h1>
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
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 flex-1 min-w-0"
          />
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            + Add Category
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-8 space-y-4"
        >
          <h2 className="text-sm font-medium mb-2">
            {editing ? "Edit Category" : "New Category"}
          </h2>
          <input
            placeholder="Category name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30"
            required
            autoFocus
          />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              {editing ? "Update" : "Create"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-5 py-2.5 rounded-full border border-white/20 text-sm text-neutral-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="text-center py-24 text-neutral-500">
          <p className="text-lg">{categories.length === 0 ? "No categories yet" : "No categories match your search"}</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10 text-neutral-500">
                <th className="text-left px-6 py-4 font-medium">Name</th>
                <th className="text-center px-6 py-4 font-medium">Active</th>
                <th className="px-6 py-4" />
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map((cat) => (
                <tr key={cat._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-6 py-4">{cat.name}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={cat.active ? "text-green-400" : "text-neutral-500"}>
                      {cat.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs text-neutral-400 hover:text-white transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(cat._id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
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
