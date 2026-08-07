"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

interface OrderData {
  _id: string;
  invoiceNumber: string;
  buyer: { name: string; email: string; phone: string };
  shipping: { method: string };
  items: Array<{ charmId: string; name: string; price: number; qty: number; subtotal: number }>;
  subtotal: number;
  shippingCost: number;
  total: number;
  status: string;
}

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(!!orderId);
  const [error, setError] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("QRIS");
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    let cancelled = false;
    fetch(`/api/orders/${orderId}/payment`)
      .then((res) => {
        if (!res.ok) throw new Error("Order not found");
        return res.json();
      })
      .then((data) => { if (!cancelled) setOrder(data); })
      .catch(() => { if (!cancelled) setError("Order not found"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [orderId]);

  const refreshOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`/api/orders/${orderId}/payment`);
      if (!res.ok) throw new Error("Order not found");
      const data = await res.json();
      setOrder(data);
      if (
        data?.status === "CANCELLED" ||
        data?.status === "EXPIRED"
      ) {
        setError("Order telah dibatalkan atau kadaluarsa");
      }
    } catch {
      // keep current state
    }
  }, [orderId]);

  useRealtime(
    [
      EventChannels.ORDER_UPDATED,
      EventChannels.orderStatus(String(orderId ?? "")),
      EventChannels.orderPayment(String(orderId ?? "")),
    ],
    {
      intervalMs: 30000,
      onEvent: () => void refreshOrder(),
      onPoll: () => void refreshOrder(),
    },
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!order || !orderId) return;

      setError("");
      setSubmitting(true);

      try {
        let proofImage = undefined;

        if ((paymentMethod === "TRANSFER" || paymentMethod === "QRIS") && paymentProof) {
          setUploading(true);
          const formData = new FormData();
          formData.append("file", paymentProof);

          const uploadRes = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadRes.ok) throw new Error("Failed to upload payment proof");
          proofImage = await uploadRes.json();
          setUploading(false);
        }

        const res = await fetch(`/api/orders/${orderId}/payment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            method: paymentMethod,
            proofImage,
            status: proofImage
              ? "WAITING_CONFIRMATION"
              : paymentMethod === "CASH"
                ? "UNPAID"
                : "UNPAID",
            paidAt: proofImage ? new Date().toISOString() : undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to submit payment");
        }

        setSuccess(true);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Something went wrong",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [order, orderId, paymentMethod, paymentProof],
  );

  const cancelOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
    } catch {
      // silent
    }
    window.location.href = "/catalogues";
  }, [orderId]);

  const qrisRequiresProof = paymentMethod === "QRIS" && !paymentProof;

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </main>
    );
  }

  const groupedItems = order
    ? Object.values(
        order.items.reduce(
          (acc, item) => {
            const key = item.charmId;
            if (acc[key]) {
              acc[key].qty += item.qty;
              acc[key].subtotal += item.subtotal;
            } else {
              acc[key] = { ...item };
            }
            return acc;
          },
          {} as Record<string, { charmId: string; name: string; price: number; qty: number; subtotal: number }>,
        ),
      )
    : [];

  if (!orderId || !order) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center justify-center gap-6">
        <p className="text-xl text-neutral-400">{error || "Invalid payment link"}</p>
        <Link
          href="/catalogues"
          className="px-6 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
        >
          Browse Charms
        </Link>
      </main>
    );
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#0b0b0b] text-white flex flex-col items-center justify-center gap-8 px-6">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
        <h1 className="text-3xl font-bold">Payment Submitted</h1>
        <div className="text-center text-neutral-400 space-y-2">
          <p>Invoice: <span className="text-white font-mono">{order.invoiceNumber}</span></p>
          {paymentMethod === "TRANSFER" && (
            <p>Your payment proof is being reviewed. We will confirm shortly.</p>
          )}
          {paymentMethod === "QRIS" && (
            <p>Please complete the QRIS payment to confirm your order.</p>
          )}
          {paymentMethod === "CASH" && (
            <p>Pay in cash when picking up your order.</p>
          )}
        </div>
        <div className="w-full max-w-sm px-6 py-4 rounded-xl border border-white/10 bg-white/[0.03] text-sm text-center space-y-1">
          <p className="text-neutral-400 uppercase tracking-widest text-[10px]">
            Estimasi Selesai
          </p>
          <p className="text-white font-medium">
            {order.shipping.method === "DELIVERY"
              ? "±1–2 jam setelah pembayaran dikonfirmasi (area Kota Semarang)"
              : "±30 menit setelah pembayaran dikonfirmasi (ambil di booth)"}
          </p>
        </div>
        <div className="px-6 py-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm font-bold text-center">
          PLS TAKE SCREENSHOOT THIS INVOICE
        </div>
        <div className="flex gap-4">
          <Link
            href="/catalogues"
            className="px-6 py-3 rounded-full border border-white/20 text-sm hover:bg-white/10 transition-colors"
          >
            Continue Shopping
          </Link>
          <Link
            href="/welcome"
            className="px-6 py-3 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
          >
            Home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <div className="fixed top-0 left-0 right-0 h-16 bg-[#0b0b0b]/90 backdrop-blur border-b border-white/10 z-50 flex items-center justify-between px-4 md:px-10">
        <button onClick={cancelOrder} className="text-sm text-neutral-400 hover:text-white transition-colors">
          ← Back
        </button>
        <span className="text-sm text-neutral-400">Payment</span>
        <div className="w-12" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto pt-24 pb-20 px-3 md:px-6 space-y-8 md:space-y-10"
      >
        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-5">
            Order Summary
          </h2>
          <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 md:p-6 space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-400">Invoice</span>
              <span className="font-mono text-xs">{order.invoiceNumber}</span>
            </div>
            {groupedItems.map((item, i) => (
              <div
                key={item.charmId}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-neutral-300">{item.name} × {item.qty}</span>
                <span className="text-neutral-400">
                  Rp{item.subtotal.toLocaleString("id-ID")}
                </span>
              </div>
            ))}
            <div className="pt-4 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>Subtotal</span>
                <span>Rp{order.subtotal.toLocaleString("id-ID")}</span>
              </div>
              {order.shipping.method === "DELIVERY" && (
                <div className="flex items-center justify-between text-sm text-neutral-500">
                  <span>Shipping</span>
                  <span>Rp{order.shippingCost.toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-semibold pt-2 border-t border-white/10">
                <span>Total</span>
                <span>Rp{order.total.toLocaleString("id-ID")}</span>
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-5">
            Payment Method
          </h2>

          <div className="flex gap-2 md:gap-3 mb-4">
            {["QRIS", "CASH"].map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => setPaymentMethod(method)}
                className={`flex-1 px-2 md:px-5 py-3 rounded-xl border text-[11px] md:text-sm font-medium transition-all ${
                  paymentMethod === method
                    ? "bg-white text-black border-white"
                    : "bg-white/[0.03] text-neutral-400 border-white/10 hover:border-white/30"
                }`}
              >
                {method === "QRIS" ? "QRIS" : "Cash"}
              </button>
            ))}
          </div>

          {paymentMethod === "TRANSFER" && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="text-sm text-neutral-400">
                Transfer to: <span className="text-white font-mono">BCA 1234567890</span>
              </div>
              <div className="text-sm text-neutral-400">
                A/n: <span className="text-white">SWAVE</span>
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Upload Payment Proof
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-neutral-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-white file:text-black file:cursor-pointer hover:file:bg-white/90 cursor-pointer"
                />
              </div>
            </div>
          )}

          {paymentMethod === "QRIS" && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
              <p className="text-sm text-neutral-400">Scan QRIS to pay</p>
              <div className="flex justify-center">
                <Image
                  src="/qris.png"
                  alt="QRIS"
                  width={400}
                  height={400}
                  className="rounded-xl"
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-400 mb-2">
                  Upload Payment Proof <span className="text-red-400">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-neutral-400 file:mr-4 file:py-2.5 file:px-5 file:rounded-full file:border-0 file:text-sm file:font-medium file:bg-white file:text-black file:cursor-pointer hover:file:bg-white/90 cursor-pointer"
                />
                {!paymentProof && (
                  <p className="text-xs text-amber-400/70 mt-1">Wajib upload bukti pembayaran QRIS sebelum lanjut</p>
                )}
              </div>
            </div>
          )}

          {paymentMethod === "CASH" && (
            <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6">
              <p className="text-sm text-neutral-400">
                Pay in cash when picking up your order.
              </p>
            </div>
          )}
        </section>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || qrisRequiresProof}
          className="w-full py-4 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? uploading
              ? "Uploading..."
              : "Submitting..."
            : qrisRequiresProof
              ? "Upload Bukti Pembayaran Terlebih Dahulu"
              : "Submit Payment"}
        </button>
      </form>
    </main>
  );
}
