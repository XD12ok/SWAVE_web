"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Charm } from "@/types/charm";
import { ShippingMethod } from "@/types/enums";

const LocationPicker = dynamic(
  () => import("@/components/ui/LocationPicker"),
  { ssr: false },
);

type ShippingForm = {
  method: ShippingMethod;
  receiverName: string;
  phone: string;
  province: string;
  regency: string;
  district: string;
  village: string;
  address: string;
  postalCode: string;
  note: string;
  pickupDate: string;
  latitude?: number;
  longitude?: number;
};

function isCategoryObject(
  c: unknown,
): c is { _id: string; name: string } {
  return typeof c === "object" && c !== null && "name" in c;
}

function toCatalogCharm(raw: Record<string, unknown>): Charm {
  const category = isCategoryObject(raw.category)
    ? (raw.category as { _id: string; name: string }).name
    : String(raw.category ?? "");

  const image =
    typeof raw.image === "object" && raw.image !== null
      ? (raw.image as { secureUrl?: string }).secureUrl ?? ""
      : String(raw.image ?? "");

  return {
    id: (raw._id ?? raw.id) as string | number,
    name: raw.name as string,
    category,
    price: raw.price as number,
    image,
    stock: (raw.stock as number) ?? 0,
    limited: (raw.limited as boolean) ?? false,
    discount: raw.discount as { enabled: boolean; value: number; startAt?: string; endAt?: string } | undefined,
  };
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const selectedIds = useMemo(() => {
    const raw = searchParams.get("charms") || "";
    return raw.split(",").filter(Boolean);
  }, [searchParams]);

  const [charms, setCharms] = useState<Charm[]>([]);
  const [charmsLoaded, setCharmsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/charms")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCharms(data.map(toCatalogCharm));
        }
      })
      .finally(() => setCharmsLoaded(true));
  }, []);

  const selectedCharms = useMemo(() => {
    const result: Array<{ charm: Charm }> = [];

    for (const id of selectedIds) {
      const charm = charms.find((c) => String(c.id) === id);
      if (charm) {
        result.push({ charm });
      }
    }

    return result;
  }, [charms, selectedIds]);

  const totalPrice = useMemo(() => {
    return selectedCharms.reduce((s, { charm }) => s + charm.price, 0);
  }, [selectedCharms]);

  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });
  const [shipping, setShipping] = useState<ShippingForm>({
    method: ShippingMethod.DELIVERY,
    receiverName: "",
    phone: "",
    province: "",
    regency: "",
    district: "",
    village: "",
    address: "",
    postalCode: "",
    note: "",
    pickupDate: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingDistance, setShippingDistance] = useState<number | null>(null);

  const updateBuyer = (field: string, value: string) =>
    setBuyer((prev) => ({ ...prev, [field]: value }));

  const updateShipping = (field: string, value: string) =>
    setShipping((prev) => ({ ...prev, [field]: value }));

  const handleLocationSelect = useCallback(
    async (result: { lat: number; lng: number; displayName: string; address: { road?: string; city?: string; town?: string; village?: string; state?: string; postcode?: string } }) => {
      const city = (result.address.city ?? result.address.town ?? "").toLowerCase();
      const state = (result.address.state ?? "").toLowerCase();
      const name = result.displayName.toLowerCase();

      const isSemarang =
        city.includes("semarang") ||
        state.includes("semarang") ||
        name.includes("kota semarang") ||
        name.includes("semarang");

      if (!isSemarang) {
        setLocationError("Pengiriman hanya tersedia di Kota Semarang");
        setShowLocationPicker(false);
        return;
      }

      setLocationError("");
      setShipping((prev) => ({
        ...prev,
        address: result.displayName,
        province: result.address.state ?? prev.province,
        regency: result.address.city ?? result.address.town ?? prev.regency,
        village: result.address.village ?? result.address.town ?? prev.village,
        postalCode: result.address.postcode ?? prev.postalCode,
        latitude: result.lat,
        longitude: result.lng,
      }));

      try {
        const res = await fetch(
          `/api/shipping-cost?lat=${result.lat}&lng=${result.lng}`,
        );
        if (res.ok) {
          const data = await res.json();
          setShippingCost(data.cost);
          setShippingDistance(data.distanceKm);
        }
      } catch {
        // fallback: keep cost at 0
      }

      setShowLocationPicker(false);
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setSubmitting(true);

      if (!buyer.name || !buyer.email || !buyer.phone) {
        setError("Harap isi semua informasi pembeli");
        setSubmitting(false);
        return;
      }

      if (selectedCharms.length === 0) {
        setError("Belum ada charm dipilih");
        setSubmitting(false);
        return;
      }

      try {
        const stockCheck = await fetch("/api/check-stock", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: selectedCharms.map(({ charm }) => ({
              charmId: String(charm.id),
              qty: 1,
            })),
          }),
        });

        if (!stockCheck.ok) {
          const err = await stockCheck.json();
          throw new Error(err.error || "Pengecekan stok gagal");
        }

        const stockResult = await stockCheck.json();

        if (!stockResult.available) {
          const unavailable = stockResult.items
            .filter((i: { enough: boolean; name: string }) => !i.enough)
            .map((i: { name: string }) => i.name)
            .join(", ");
          throw new Error(`Stok tidak mencukupi: ${unavailable}`);
        }

        if (shipping.method === ShippingMethod.DELIVERY) {
        if (!shipping.latitude || !shipping.longitude) {
          setError("Harap pilih lokasi di peta terlebih dahulu");
          setSubmitting(false);
          return;
        }

        const regency = (shipping.regency ?? "").toLowerCase();
        const village = (shipping.village ?? "").toLowerCase();
        if (!regency.includes("semarang") && !village.includes("semarang")) {
          setError("Pengiriman hanya tersedia di Kota Semarang");
          setSubmitting(false);
          return;
        }
      }

      const orderPayload = {
          buyer: {
            name: buyer.name,
            email: buyer.email,
            phone: buyer.phone,
          },
          shipping: {
            method: shipping.method,
            receiverName:
              shipping.method === ShippingMethod.DELIVERY
                ? shipping.receiverName
                : buyer.name,
            phone: shipping.phone || buyer.phone,
            province: shipping.province,
            regency: shipping.regency,
            district: shipping.district,
            village: shipping.village,
            address: shipping.address,
            postalCode: shipping.postalCode,
            note: shipping.note,
            latitude: shipping.latitude,
            longitude: shipping.longitude,
          },
          items: selectedCharms.map(({ charm }) => ({
            charmId: charm.id,
            name: charm.name,
            price: charm.price,
            qty: 1,
            subtotal: charm.price,
          })),
          subtotal: totalPrice,
          shippingCost: shipping.method === ShippingMethod.DELIVERY ? shippingCost : 0,
          total: totalPrice + (shipping.method === ShippingMethod.DELIVERY ? shippingCost : 0),
        };

        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderPayload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Gagal membuat pesanan");
        }

        const order = await res.json();
        localStorage.removeItem("bracelet-selection");
        router.push(`/payment?orderId=${order._id}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Terjadi kesalahan",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [buyer, shipping, selectedCharms, totalPrice, router, shippingCost],
  );

  if (selectedCharms.length === 0) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center justify-center gap-6">
        {!charmsLoaded ? (
          <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          <>
            <p className="text-xl text-neutral-400">Belum ada charm dipilih</p>
            <Link
              href="/catalogues"
              className="px-6 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Pilih Charm
            </Link>
          </>
        )}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#0b0b0b]/90 backdrop-blur border-b border-white/10 z-50 flex items-center justify-between px-4 md:px-10">
        <Link href="/catalogues" className="text-sm text-neutral-400 hover:text-white transition-colors">
          ← Kembali
        </Link>
        <span className="text-sm text-neutral-400">Checkout</span>
        <div className="w-12" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto pt-24 pb-20 px-3 md:px-6 space-y-8 md:space-y-10"
      >

        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-5">
            Ringkasan Pesanan
          </h2>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 md:p-6 space-y-4">
            {Object.values(selectedCharms.reduce(
              (acc, { charm }) => {
                const key = String(charm.id);
                if (acc[key]) {
                  acc[key].qty++;
                  acc[key].subtotal += charm.price;
                } else {
                  acc[key] = { charm, qty: 1, subtotal: charm.price };
                }
                return acc;
              },
              {} as Record<string, { charm: Charm; qty: number; subtotal: number }>,
            )).map(({ charm, qty, subtotal }) => (
              <div
                key={charm.id}
                className="flex items-center gap-3 md:gap-4 text-sm"
              >
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden shrink-0">
                  <Image
                    src={charm.image}
                    alt={charm.name}
                    width={32}
                    height={32}
                    className="object-contain"
                  />
                </div>
                <span className="flex-1 text-neutral-300 text-xs md:text-sm truncate">{charm.name}</span>
                <div className="text-right">
                  <span className="text-neutral-500 text-[10px] md:text-xs block">
                    Rp{charm.price.toLocaleString("id-ID")} × {qty}
                  </span>
                  <span className="text-neutral-400 text-xs md:text-sm">
                    Rp{subtotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between text-lg font-semibold">
              <span>Subtotal</span>
              <span>Rp{totalPrice.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-5">
            Informasi Pembeli
          </h2>
          <div className="space-y-4">
            <Input
              placeholder="Nama Lengkap"
              value={buyer.name}
              onChange={(v) => updateBuyer("name", v)}
              required
            />
            <Input
              placeholder="Email"
              value={buyer.email}
              onChange={(v) => updateBuyer("email", v)}
              required
            />
            <Input
              placeholder="Nomor Telepon"
              value={buyer.phone}
              onChange={(v) => updateBuyer("phone", v)}
              required
            />
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-5">
            Metode Pengiriman
          </h2>
          <div className="flex gap-3 mb-3">
            <button
              type="button"
              onClick={() => {
                updateShipping("method", ShippingMethod.DELIVERY);
                setLocationError("");
              }}
              className={`flex-1 px-5 py-4 rounded-xl border text-sm font-medium transition-all ${
                shipping.method === ShippingMethod.DELIVERY
                  ? "bg-white text-black border-white"
                  : "bg-white/[0.03] text-neutral-400 border-white/10 hover:border-white/30"
              }`}
            >
              Antar
            </button>
            <button
              type="button"
              onClick={() => {
                updateShipping("method", ShippingMethod.PICKUP);
                setLocationError("");
                setShippingCost(0);
                setShippingDistance(null);
              }}
              className={`flex-1 px-5 py-4 rounded-xl border text-sm font-medium transition-all ${
                shipping.method === ShippingMethod.PICKUP
                  ? "bg-white text-black border-white"
                  : "bg-white/[0.03] text-neutral-400 border-white/10 hover:border-white/30"
              }`}
            >
              Ambil Sendiri
            </button>
          </div>

          <p className="text-xs text-neutral-500 mb-4">
            Pengiriman antar hanya tersedia di area <span className="text-neutral-400">Kota Semarang</span>.
          </p>

          {locationError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {locationError}
            </div>
          )}

          {shipping.method === ShippingMethod.DELIVERY ? (
            <div className="space-y-4">
              <Input
                placeholder="Nama Penerima"
                value={shipping.receiverName}
                onChange={(v) => updateShipping("receiverName", v)}
                required
              />
              <Input
                placeholder="Nomor Telepon"
                value={shipping.phone}
                onChange={(v) => updateShipping("phone", v)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  placeholder="Provinsi"
                  value={shipping.province}
                  onChange={(v) => updateShipping("province", v)}
                />
                <Input
                  placeholder="Kabupaten / Kota"
                  value={shipping.regency}
                  onChange={(v) => updateShipping("regency", v)}
                />
                <Input
                  placeholder="Kecamatan"
                  value={shipping.district}
                  onChange={(v) => updateShipping("district", v)}
                />
                <Input
                  placeholder="Kelurahan"
                  value={shipping.village}
                  onChange={(v) => updateShipping("village", v)}
                />
              </div>
              <Input
                placeholder="Alamat Lengkap"
                value={shipping.address}
                onChange={(v) => updateShipping("address", v)}
              />
              <button
                type="button"
                onClick={() => {
                setShowLocationPicker(true);
                setShippingCost(0);
                setShippingDistance(null);
              }}
                className="w-full h-12 rounded-xl border border-dashed border-white/20 text-sm text-neutral-400 hover:text-white hover:border-white/40 transition-colors flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                Pilih di Peta
              </button>
              <Input
                placeholder="Kode Pos"
                value={shipping.postalCode}
                onChange={(v) => updateShipping("postalCode", v)}
              />
              <textarea
                placeholder="Catatan (opsional)"
                value={shipping.note}
                onChange={(e) => updateShipping("note", e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-5 py-3 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30 transition-colors resize-none"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                placeholder="Nama Pengambil"
                value={shipping.receiverName}
                onChange={(v) => updateShipping("receiverName", v)}
                required
              />
              <Input
                placeholder="Nomor Telepon"
                value={shipping.phone}
                onChange={(v) => updateShipping("phone", v)}
              />
              <Input
                type="date"
                placeholder="Tanggal Pengambilan"
                value={shipping.pickupDate}
                onChange={(v) => updateShipping("pickupDate", v)}
              />
              <textarea
                placeholder="Catatan (opsional)"
                value={shipping.note}
                onChange={(e) => updateShipping("note", e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-white/[0.05] border border-white/10 px-5 py-3 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30 transition-colors resize-none"
              />
            </div>
          )}
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="sticky bottom-0 bg-[#0b0b0b]/90 backdrop-blur-md border-t border-white/10 -mx-3 md:-mx-6 px-3 md:px-6 py-4 md:py-5">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] md:text-xs text-neutral-500">Total</p>
              <p className="text-lg md:text-2xl font-bold">
                Rp
                {(
                  totalPrice +
                  (shipping.method === ShippingMethod.DELIVERY
                    ? shippingCost
                    : 0)
                ).toLocaleString("id-ID")}
              </p>
              {shipping.method === ShippingMethod.DELIVERY && shippingCost > 0 && (
                <p className="text-[10px] md:text-xs text-neutral-500">
                  ongkir Rp{shippingCost.toLocaleString("id-ID")}
                  {shippingDistance !== null && (
                    <span className="text-neutral-600"> ({shippingDistance} km)</span>
                  )}
                </p>
              )}
              {shipping.method === ShippingMethod.DELIVERY && shippingCost === 0 && shipping.latitude && (
                <p className="text-[10px] md:text-xs text-neutral-500">
                  Menghitung ongkir...
                </p>
              )}
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 md:px-10 py-3 md:py-4 rounded-full bg-white text-black text-xs md:text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {submitting ? "Memproses..." : "Lanjut ke Pembayaran"}
            </button>
          </div>
        </div>
      </form>

      {showLocationPicker && (
        <LocationPicker
          onLocationSelect={handleLocationSelect}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
    </main>
  );
}

function Input({
  type = "text",
  placeholder,
  value,
  onChange,
  required,
}: {
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full h-12 rounded-xl bg-white/[0.05] border border-white/10 px-5 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30 transition-colors"
    />
  );
}
