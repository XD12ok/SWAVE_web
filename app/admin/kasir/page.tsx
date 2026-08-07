"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";
import { getDiscountedPrice } from "@/lib/discount";

interface KasirCharm {
  _id: string;
  name: string;
  category?: { _id: string; name: string } | string;
  price: number;
  stock: number;
  reservedStock: number;
  active: boolean;
  image?: { publicId: string; secureUrl: string };
  discount?: {
    enabled: boolean;
    value: number;
    startAt?: string;
    endAt?: string;
  };
}

interface CartItem {
  charmId: string;
  name: string;
  price: number;
  originalPrice: number;
  image?: string;
  qty: number;
}

export default function AdminKasir() {
  const [charms, setCharms] = useState<KasirCharm[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);

  const CASHIERS = ["Cheris", "Regas", "Mey", "Aaf"];
  const [cashierName, setCashierName] = useState("");
  const [buyerName, setBuyerName] = useState("");

  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "QRIS">("CASH");
  const [cashReceived, setCashReceived] = useState("");
  const [qrisConfirmed, setQrisConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [successOrder, setSuccessOrder] = useState<{
    invoiceNumber: string;
    total: number;
    originalTotal: number;
    cashierName: string;
    buyerName: string;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/charms", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCharms(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  useRealtime([EventChannels.CHARM_UPDATED], {
    intervalMs: 10000,
    onEvent: () => void load(),
    onPoll: () => void load(),
  });

  const availableFor = (charm: KasirCharm) =>
    Math.max(0, (charm.stock ?? 0) - (charm.reservedStock ?? 0));

  const total = useMemo(
    () => cart.reduce((s, i) => s + i.price * i.qty, 0),
    [cart],
  );

  const originalTotal = useMemo(
    () => cart.reduce((s, i) => s + i.originalPrice * i.qty, 0),
    [cart],
  );

  const discountAmount = Math.max(0, originalTotal - total);

  const totalItems = useMemo(
    () => cart.reduce((s, i) => s + i.qty, 0),
    [cart],
  );

  const cashChange = Math.max(0, (Number(cashReceived) || 0) - total);
  const originalCashChange = Math.max(
    0,
    (Number(cashReceived) || 0) - originalTotal,
  );

  const filteredCharms = useMemo(() => {
    const q = search.trim().toLowerCase();
    return charms.filter(
      (c) => !q || c.name.toLowerCase().includes(q),
    );
  }, [charms, search]);

  const addToCart = (charm: KasirCharm) => {
    const inCart = cart.find((c) => c.charmId === charm._id)?.qty ?? 0;
    if (inCart >= availableFor(charm)) {
      setError("Stok tidak mencukupi");
      return;
    }
    setError("");
    setCart((prev) => {
      const existing = prev.find((c) => c.charmId === charm._id);
      if (existing) {
        return prev.map((c) =>
          c.charmId === charm._id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [
        ...prev,
        {
          charmId: charm._id,
          name: charm.name,
          price: getDiscountedPrice(charm.price, charm.discount),
          originalPrice: charm.price,
          image: charm.image?.secureUrl,
          qty: 1,
        },
      ];
    });
  };

  const changeQty = (charmId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.charmId === charmId ? { ...c, qty: Math.max(0, c.qty + delta) } : c,
        )
        .filter((c) => c.qty > 0),
    );
  };

  const clearCart = () => {
    setCart([]);
    setCashReceived("");
    setQrisConfirmed(false);
    setBuyerName("");
    setError("");
  };

  const handlePay = async () => {
    setError("");
    if (!cashierName) {
      setError("Pilih nama kasir terlebih dahulu");
      return;
    }
    if (cart.length === 0) {
      setError("Keranjang kosong");
      return;
    }
    if (paymentMethod === "CASH" && (Number(cashReceived) || 0) < total) {
      setError("Uang yang diterima kurang dari total");
      return;
    }
    if (paymentMethod === "QRIS" && !qrisConfirmed) {
      setError("Konfirmasi pembayaran QRIS terlebih dahulu");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/kasir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({ charmId: c.charmId, qty: c.qty })),
          paymentMethod,
          cashierName,
          buyerName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Transaksi gagal");
      }
      setSuccessOrder({
        invoiceNumber: data.invoiceNumber,
        total: data.total,
        originalTotal,
        cashierName,
        buyerName: buyerName.trim() || "Walk-in",
      });
      clearCart();
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Transaksi gagal");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (successOrder) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
          <span className="text-4xl text-green-400">✓</span>
        </div>
        <div>
          <h1 className="text-3xl font-bold mb-2">Transaksi Berhasil</h1>
          <p className="text-neutral-400">
            Invoice: <span className="text-white font-mono">{successOrder.invoiceNumber}</span>
          </p>
          <p className="text-sm text-neutral-400 mt-2">
            Kasir: <span className="text-white">{successOrder.cashierName}</span>
          </p>
          <p className="text-sm text-neutral-400">
            Pembeli: <span className="text-white">{successOrder.buyerName}</span>
          </p>
          <div className="mt-3 space-y-1">
            {successOrder.originalTotal > successOrder.total && (
              <>
                <p className="text-sm text-neutral-500 line-through">
                  Rp{successOrder.originalTotal.toLocaleString("id-ID")}
                </p>
                <p className="text-xs text-amber-400">
                  Diskon −Rp
                  {(successOrder.originalTotal - successOrder.total).toLocaleString("id-ID")}
                </p>
              </>
            )}
            <p className="text-2xl font-bold">
              Rp{successOrder.total.toLocaleString("id-ID")}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSuccessOrder(null)}
          className="px-8 py-4 rounded-full bg-white text-black text-base font-medium hover:bg-white/90 transition-colors"
        >
          Transaksi Baru
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 items-start h-full">
      {/* Product grid */}
      <div className="flex-1 w-full min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h1 className="text-2xl font-bold">Kasir</h1>
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              className="h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300"
            >
              <option value="">Kasir yang jaga...</option>
              {CASHIERS.map((name) => (
                <option key={name} value={name} className="bg-neutral-900">
                  {name}
                </option>
              ))}
            </select>
            <input
              placeholder="Cari charm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 placeholder:text-neutral-500 w-full sm:w-64"
            />
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-11 px-4 rounded-xl border border-white/10 bg-white/[0.05] text-sm font-medium text-neutral-300 hover:border-white/30 hover:bg-white/[0.08] transition-colors disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2"
            >
              <span
                className={`inline-block ${
                  refreshing ? "animate-spin" : ""
                }`}
              >
                ⟳
              </span>
              Refresh DB
            </button>
          </div>
        </div>

        {filteredCharms.length === 0 ? (
          <div className="text-center py-24 text-neutral-500">
            <p className="text-lg">Tidak ada charm</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredCharms.map((charm) => {
              const available = availableFor(charm);
              const price = getDiscountedPrice(charm.price, charm.discount);
              const disabled = charm.active === false || available <= 0;

              return (
                <button
                  key={charm._id}
                  onClick={() => addToCart(charm)}
                  disabled={disabled}
                  className={`group relative flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 pt-3 transition-all min-h-[150px] ${
                    disabled
                      ? "border-white/5 bg-white/[0.02] opacity-40 cursor-not-allowed"
                      : "border-white/10 bg-white/[0.03] hover:border-white/40 hover:bg-white/[0.06] active:scale-95"
                  }`}
                >
                  {charm.active === false && (
                    <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-medium">
                      Nonaktif
                    </span>
                  )}
                  {charm.image?.secureUrl ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-white/5">
                      <Image
                        src={charm.image.secureUrl}
                        alt={charm.name}
                        width={64}
                        height={64}
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-white/5" />
                  )}
                  <span className="text-sm font-medium text-center leading-tight line-clamp-2">
                    {charm.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {price < charm.price ? (
                      <>
                        <span className="text-[11px] line-through text-red-400/60">
                          Rp{charm.price.toLocaleString("id-ID")}
                        </span>
                        <span className="text-sm font-semibold text-red-400">
                          Rp{price.toLocaleString("id-ID")}
                        </span>
                      </>
                    ) : (
                      <span className="text-sm font-semibold">
                        Rp{price.toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                      available <= 0
                        ? "bg-red-500/15 text-red-400"
                        : available <= 5
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-green-500/15 text-green-400"
                    }`}
                  >
                    {available <= 0 ? "Habis" : `Sisa ${available}`}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Cart / payment panel */}
      <aside className="w-full lg:w-[360px] shrink-0 lg:sticky lg:top-0 rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-neutral-400">
            Transaksi
          </h2>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-neutral-500 hover:text-red-400 transition-colors"
            >
              Kosongkan
            </button>
          )}
        </div>

        <div className="space-y-2 max-h-[30vh] overflow-auto pr-1">
          {cart.length === 0 ? (
            <p className="text-center text-neutral-600 text-sm py-8">
              Ketuk charm untuk menambahkan
            </p>
          ) : (
            cart.map((item) => (
              <div
                key={item.charmId}
                className="flex items-center gap-3 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5"
              >
                {item.image ? (
                  <div className="w-9 h-9 rounded-md overflow-hidden bg-white/5 shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-md bg-white/5 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{item.name}</p>
                  <p className="text-xs text-neutral-500">
                    {item.originalPrice > item.price && (
                      <span className="line-through mr-1 text-neutral-600">
                        Rp{item.originalPrice.toLocaleString("id-ID")}
                      </span>
                    )}
                    Rp{item.price.toLocaleString("id-ID")} × {item.qty}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => changeQty(item.charmId, -1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors"
                    aria-label="Kurangi"
                  >
                    −
                  </button>
                  <span className="w-6 text-center text-sm font-mono">
                    {item.qty}
                  </span>
                  <button
                    onClick={() => changeQty(item.charmId, 1)}
                    className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors"
                    aria-label="Tambah"
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-white/10 space-y-1 text-sm">
          <div className="flex justify-between text-neutral-400">
            <span>Item</span>
            <span>{totalItems}</span>
          </div>
          {discountAmount > 0 && (
            <>
              <div className="flex justify-between text-neutral-500">
                <span>Harga Asli</span>
                <span className="line-through">
                  Rp{originalTotal.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between text-amber-400">
                <span>Diskon</span>
                <span>−Rp{discountAmount.toLocaleString("id-ID")}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span>Rp{total.toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPaymentMethod("CASH")}
            className={`h-11 rounded-xl border text-sm font-medium transition-all ${
              paymentMethod === "CASH"
                ? "bg-white text-black border-white"
                : "bg-white/[0.03] text-neutral-400 border-white/10 hover:border-white/30"
            }`}
          >
            Cash
          </button>
          <button
            onClick={() => setPaymentMethod("QRIS")}
            className={`h-11 rounded-xl border text-sm font-medium transition-all ${
              paymentMethod === "QRIS"
                ? "bg-white text-black border-white"
                : "bg-white/[0.03] text-neutral-400 border-white/10 hover:border-white/30"
            }`}
          >
            QRIS
          </button>
        </div>

        <input
          placeholder="Nama pembeli (kosong = Walk-in)"
          value={buyerName}
          onChange={(e) => setBuyerName(e.target.value)}
          className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30 text-neutral-200 placeholder:text-neutral-500"
        />

        {paymentMethod === "CASH" && (
          <div className="space-y-2">
            <input
              type="number"
              min={0}
              placeholder="Uang diterima"
              value={cashReceived}
              onChange={(e) => setCashReceived(e.target.value)}
              className="w-full h-11 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none focus:border-white/30 text-neutral-200 placeholder:text-neutral-500"
            />
            <div className="flex justify-between text-sm">
              <span className="text-neutral-400">Kembalian (setelah diskon)</span>
              <span
                className={
                  (Number(cashReceived) || 0) >= total
                    ? "text-green-400 font-semibold"
                    : "text-neutral-500"
                }
              >
                Rp{cashChange.toLocaleString("id-ID")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Kembalian (harga asli)</span>
              <span
                className={
                  (Number(cashReceived) || 0) >= originalTotal
                    ? "text-emerald-400/80"
                    : "text-neutral-600"
                }
              >
                Rp{originalCashChange.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === "QRIS" && (
          <div className="space-y-3">
            <div className="flex justify-center rounded-xl overflow-hidden bg-white p-2">
              <Image
                src="/qris.png"
                alt="QRIS"
                width={200}
                height={200}
                className="rounded-lg"
              />
            </div>
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={qrisConfirmed}
                onChange={(e) => setQrisConfirmed(e.target.checked)}
                className="w-4 h-4 accent-white"
              />
              Pembeli sudah membayar
            </label>
          </div>
        )}

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={handlePay}
          disabled={submitting || cart.length === 0}
          className="w-full h-14 rounded-2xl bg-white text-black text-base font-bold hover:bg-white/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Memproses..." : `Bayar Rp${total.toLocaleString("id-ID")}`}
        </button>
      </aside>
    </div>
  );
}
