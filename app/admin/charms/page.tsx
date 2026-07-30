"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toSlug } from "@/lib/slug";

interface CharmDiscount {
  enabled: boolean;
  type: string;
  value: number;
  startAt?: string;
  endAt?: string;
}

interface Charm {
  _id: string;
  name: string;
  slug?: string;
  category?: { _id: string; name: string } | string;
  price: number;
  stock: number;
  active: boolean;
  limited: boolean;
  image?: { publicId: string; secureUrl: string };
  discount?: CharmDiscount;
}

interface Category {
  _id: string;
  name: string;
}

interface FormState {
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  weight: number;
  imageFile: File | null;
  imagePreview: string;
  imagePublicId: string;
  imageSecureUrl: string;
  discountEnabled: boolean;
  discountValue: number;
  discountStartAt: string;
  discountEndAt: string;
  limited: boolean;
  active: boolean;
}

const INITIAL_FORM: FormState = {
  name: "",
  category: "",
  description: "",
  price: 0,
  stock: 0,
  weight: 10,
  imageFile: null,
  imagePreview: "",
  imagePublicId: "",
  imageSecureUrl: "",
  discountEnabled: false,
  discountValue: 0,
  discountStartAt: "",
  discountEndAt: "",
  limited: false,
  active: true,
};

export default function AdminCharms() {
  const [charms, setCharms] = useState<Charm[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Charm | null>(null);
  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [cRes, catRes] = await Promise.all([
          fetch("/api/charms"),
          fetch("/api/categories"),
        ]);
        if (!cancelled) {
          if (cRes.ok) setCharms(await cRes.json());
          if (catRes.ok) {
            const cats = await catRes.json();
            if (Array.isArray(cats)) {
              if (cats.length > 0 && typeof cats[0] === "string") {
                setCategories((cats as string[]).map((name) => ({ _id: name, name })));
              } else {
                setCategories(cats);
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to load:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const resetForm = () => {
    setForm({ ...INITIAL_FORM });
    setEditing(null);
    setShowForm(false);
  };

  const openEdit = (charm: Charm) => {
    const catId =
      typeof charm.category === "object" && charm.category
        ? charm.category._id
        : "";
    const imageUrl =
      typeof charm.image === "object" && charm.image
        ? charm.image.secureUrl
        : "";

    setForm({
      name: charm.name,
      category: catId,
      description: "",
      price: charm.price,
      stock: charm.stock,
      weight: 10,
      imageFile: null,
      imagePreview: imageUrl,
      imagePublicId: charm.image?.publicId ?? "",
      imageSecureUrl: imageUrl,
      discountEnabled: charm.discount?.enabled ?? false,
      discountValue: charm.discount?.value ?? 0,
      discountStartAt: charm.discount?.startAt
        ? new Date(charm.discount.startAt).toISOString().slice(0, 16)
        : "",
      discountEndAt: charm.discount?.endAt
        ? new Date(charm.discount.endAt).toISOString().slice(0, 16)
        : "",
      limited: charm.limited ?? false,
      active: charm.active,
    });
    setEditing(charm);
    setShowForm(true);
  };

  const reload = async () => {
    try {
      const [cRes, catRes] = await Promise.all([
        fetch("/api/charms"),
        fetch("/api/categories"),
      ]);
      if (cRes.ok) setCharms(await cRes.json());
      if (catRes.ok) {
        const cats = await catRes.json();
        if (Array.isArray(cats)) {
          if (cats.length > 0 && typeof cats[0] === "string") {
            setCategories((cats as string[]).map((name) => ({ _id: name, name })));
          } else {
            setCategories(cats);
          }
        }
      }
    } catch {
      // ignore
    }
  };

  const handleImageUpload = async (file: File): Promise<{ publicId: string; secureUrl: string } | null> => {
    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        return await res.json();
      }
    } catch {
      // ignore
    } finally {
      setUploading(false);
    }
    return null;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    let image: { publicId: string; secureUrl: string } = editing?.image ?? { publicId: "", secureUrl: "" };

    if (form.imageFile) {
      const uploaded = await handleImageUpload(form.imageFile);
      if (uploaded) {
        image = uploaded;
      } else {
        alert("Failed to upload image");
        return;
      }
    } else if (form.imagePreview && !editing) {
      if (!image.secureUrl) {
        image = { publicId: "", secureUrl: form.imagePreview };
      }
    }

    const discountPayload = form.discountEnabled
      ? {
          enabled: true,
          type: "PERCENTAGE",
          value: form.discountValue,
          ...(form.discountStartAt
            ? { startAt: new Date(form.discountStartAt).toISOString() }
            : {}),
          ...(form.discountEndAt
            ? { endAt: new Date(form.discountEndAt).toISOString() }
            : {}),
        }
      : { enabled: false, type: "PERCENTAGE", value: 0 };

    const payload: Record<string, unknown> = {
      name: form.name,
      slug: toSlug(form.name),
      category: form.category || undefined,
      price: form.price,
      stock: form.stock,
      weight: form.weight,
      description: form.description,
      image,
      discount: discountPayload,
      limited: form.limited,
      active: form.active,
    };

    try {
      const res = editing
        ? await fetch(`/api/charms/${editing._id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/charms", {
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
      alert("Failed to save charm");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this charm?")) return;
    try {
      const res = await fetch(`/api/charms/${id}`, { method: "DELETE" });
      if (res.ok) reload();
    } catch {
      alert("Failed to delete");
    }
  };

  const discountedPrice = (price: number, discount?: CharmDiscount) => {
    if (!discount?.enabled || !discount.value) return null;
    return Math.round(price - (price * discount.value) / 100);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <h1 className="text-2xl font-bold">Charms</h1>
        <div className="flex gap-3">
          <input
            placeholder="Search charms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 flex-1 min-w-0"
          />
          <button
            onClick={() => { resetForm(); setShowForm(true); }}
            className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            + Add Charm
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-8 space-y-5"
        >
          <h2 className="text-sm font-semibold text-white/80">
            {editing ? "Edit Charm" : "New Charm"}
          </h2>

          {/* Name */}
          <Field label="Name" help="The display name of the charm">
            <input
              placeholder="e.g. Rose Gold Heart"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30"
              required
            />
          </Field>

          {/* Category */}
          <Field label="Category" help="Which collection this charm belongs to">
            <select
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30 text-neutral-300"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id} className="bg-neutral-900">
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>

          {/* Description */}
          <Field label="Description" help="Optional description shown on the product page">
            <textarea
              placeholder="Brief description of the charm..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-4 py-3 text-sm outline-none focus:border-white/30 resize-none"
            />
          </Field>

          {/* Price & Stock row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Price (Rp)" help="Base price before discount">
              <input
                type="number"
                placeholder="35000"
                value={form.price === 0 ? 0 : form.price || ""}
                onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30"
                min={0}
              />
            </Field>

            <Field label="Stock" help="Physical quantity available">
              <input
                type="number"
                placeholder="10"
                value={form.stock === 0 ? 0 : form.stock || ""}
                onChange={(e) => setForm((f) => ({ ...f, stock: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30"
                min={0}
              />
            </Field>

            <Field label="Weight (g)" help="Weight for shipping calculation">
              <input
                type="number"
                placeholder="10"
                value={form.weight === 0 ? 0 : form.weight || ""}
                onChange={(e) => setForm((f) => ({ ...f, weight: Number(e.target.value) }))}
                className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30"
                min={0}
              />
            </Field>
          </div>

          {/* Image Upload */}
          <Field label="Image" help="Upload a transparent PNG of the charm">
            <div className="flex items-center gap-4">
              <label className="cursor-pointer px-5 py-2.5 rounded-full bg-white/[0.08] border border-white/20 text-sm text-neutral-300 hover:bg-white/[0.12] transition-colors">
                Choose File
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setForm((f) => ({
                        ...f,
                        imageFile: file,
                        imagePreview: URL.createObjectURL(file),
                      }));
                    }
                  }}
                />
              </label>
              {uploading && <span className="text-sm text-amber-400">Uploading...</span>}
              {form.imagePreview && (
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-white/10 bg-white/5">
                  <Image
                    src={form.imagePreview}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                </div>
              )}
            </div>
          </Field>

          {/* Discount Section */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-white/80">Discount</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.discountEnabled}
                  onChange={(e) => setForm((f) => ({ ...f, discountEnabled: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 rounded-full bg-white/10 peer-checked:bg-white peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:start-[2px] after:bg-black after:rounded-full after:h-4 after:w-4 after:transition-all" />
              </label>
            </div>

            {form.discountEnabled && (
              <div className="space-y-4 pl-1">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[11px] text-neutral-500 mb-1">Discount (%)</p>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="10"
                        value={form.discountValue === 0 ? 0 : form.discountValue || ""}
                        onChange={(e) => setForm((f) => ({ ...f, discountValue: Math.min(100, Number(e.target.value)) }))}
                        className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 pr-8 text-sm outline-none focus:border-white/30"
                        min={0}
                        max={100}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">%</span>
                    </div>
                  </div>

                  {form.discountValue > 0 && (
                    <div className="flex-1 pt-4">
                      <p className="text-[11px] text-neutral-500 mb-1">Price after discount</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm line-through text-red-400/60">
                          Rp{form.price.toLocaleString("id-ID")}
                        </span>
                        <span className="text-sm font-semibold text-red-400">
                          Rp{Math.round(form.price - (form.price * form.discountValue) / 100).toLocaleString("id-ID")}
                        </span>
                      </div>
                      {form.discountStartAt && form.discountEndAt && (
                        <div className="mt-2">
                          <CountdownTimer startAt={form.discountStartAt} endAt={form.discountEndAt} />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] text-neutral-500 mb-1">Start Date</p>
                    <input
                      type="datetime-local"
                      value={form.discountStartAt}
                      onChange={(e) => setForm((f) => ({ ...f, discountStartAt: e.target.value }))}
                      className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30 text-neutral-300 [color-scheme:dark]"
                    />
                  </div>
                  <div>
                    <p className="text-[11px] text-neutral-500 mb-1">End Date</p>
                    <input
                      type="datetime-local"
                      value={form.discountEndAt}
                      onChange={(e) => setForm((f) => ({ ...f, discountEndAt: e.target.value }))}
                      className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30 text-neutral-300 [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Toggles row */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm">
              <span className="text-neutral-400">
                Limited Edition
                <span className="block text-[10px] text-neutral-600">Show a limited badge on this charm</span>
              </span>
              <input
                type="checkbox"
                checked={form.limited}
                onChange={(e) => setForm((f) => ({ ...f, limited: e.target.checked }))}
                className="accent-white"
              />
            </label>

            <label className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-sm">
              <span className="text-neutral-400">
                Active
                <span className="block text-[10px] text-neutral-600">Visible in the catalogue</span>
              </span>
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="accent-white"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={uploading}
              className="px-6 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading Image..." : editing ? "Update Charm" : "Create Charm"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 rounded-full border border-white/20 text-sm text-neutral-400 hover:text-white transition-colors"
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
      ) : charms.length === 0 ? (
        <div className="text-center py-24 text-neutral-500">
          <p className="text-lg">No charms yet</p>
          <p className="text-sm mt-2">Add your first charm to get started</p>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[576px]">
            <thead>
              <tr className="border-b border-white/10 text-neutral-500">
                <th className="text-left px-4 py-4 font-medium w-12" />
                <th className="text-left px-4 py-4 font-medium">Name</th>
                <th className="text-left px-4 py-4 font-medium">Category</th>
                <th className="text-right px-4 py-4 font-medium">Price</th>
                <th className="text-right px-4 py-4 font-medium">Stock</th>
                <th className="text-center px-4 py-4 font-medium">Status</th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody>
              {charms
                .filter((c) => !searchQuery || c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((charm) => {
                const disc = discountedPrice(charm.price, charm.discount);
                return (
                  <tr
                    key={charm._id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      {charm.image?.secureUrl && (
                        <div className="w-10 h-10 rounded-lg overflow-hidden bg-white/5">
                          <Image
                            src={charm.image.secureUrl}
                            alt={charm.name}
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>{charm.name}</span>
                        {charm.limited && (
                          <span className="text-[9px] uppercase tracking-wider bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-medium">
                            Limited
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-neutral-400">
                      {typeof charm.category === "object" && charm.category
                        ? charm.category.name
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {disc !== null ? (
                        <div className="flex flex-col items-end">
                          <span className="text-[11px] line-through text-red-400/60">
                            Rp{charm.price.toLocaleString("id-ID")}
                          </span>
                          <span className="text-red-400">
                            Rp{disc.toLocaleString("id-ID")}
                          </span>
                          <span className="text-[9px] text-amber-400">
                            -{charm.discount?.value ?? 0}%
                          </span>
                        </div>
                      ) : (
                        <span>Rp{charm.price.toLocaleString("id-ID")}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{charm.stock}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={charm.active ? "text-green-400" : "text-neutral-500"}>
                        {charm.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEdit(charm)}
                          className="text-xs text-neutral-400 hover:text-white transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(charm._id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CountdownTimer({ startAt, endAt }: { startAt: string; endAt: string }) {
  const target = useMemo(() => new Date(endAt).getTime(), [endAt]);
  const start = useMemo(() => new Date(startAt).getTime(), [startAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target - now;
  const startsIn = start - now;

  if (diff <= 0) {
    return <span className="text-[11px] text-red-400/60">Expired</span>;
  }

  if (startsIn > 0) {
    const d = Math.floor(startsIn / 86400000);
    const h = Math.floor((startsIn % 86400000) / 3600000);
    const m = Math.floor((startsIn % 3600000) / 60000);
    const s = Math.floor((startsIn % 60000) / 1000);
    return (
      <span className="text-[11px] text-red-400/60">
        Starts in {d}d {h}h {m}m {s}s
      </span>
    );
  }

  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <span className="text-[11px] text-red-400/80">
      Ends in {d}d {h}h {m}m {s}s
    </span>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm text-neutral-300 mb-1.5">
        {label}
        <span className="block text-[10px] text-neutral-600 font-normal">{help}</span>
      </label>
      {children}
    </div>
  );
}
