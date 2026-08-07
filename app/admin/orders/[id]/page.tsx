"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { OrderStatus, PaymentStatus, ShippingMethod } from "@/types/enums";
import { useRealtime } from "@/hooks/use-realtime";
import { EventChannels } from "@/lib/events";

interface Order {
  _id: string;
  invoiceNumber: string;
  buyer: { name: string; email: string; phone: string };
  shipping: {
    method: ShippingMethod;
    receiverName?: string;
    phone?: string;
    province?: string;
    regency?: string;
    district?: string;
    village?: string;
    address?: string;
    postalCode?: string;
    note?: string;
    latitude?: number;
    longitude?: number;
    shippingCost?: number;
  };
  items: Array<{
    charmId: string;
    name: string;
    image?: { publicId: string; secureUrl: string };
    price: number;
    qty: number;
    subtotal: number;
  }>;
  payment: {
    method?: string;
    amount?: number;
    proofImage?: { publicId: string; secureUrl: string };
    status: PaymentStatus;
    paidAt?: string;
    confirmedAt?: string;
  };
  status: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  notes?: string;
  source?: string;
  cashierName?: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: "Pending Payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for Pickup",
  SHIPPED: "Shipped",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  EXPIRED: "Expired",
};

const STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.PAID, OrderStatus.CANCELLED],
  [OrderStatus.PAID]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
  [OrderStatus.PROCESSING]: [OrderStatus.READY_FOR_PICKUP, OrderStatus.SHIPPED, OrderStatus.CANCELLED],
  [OrderStatus.READY_FOR_PICKUP]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.SHIPPED]: [OrderStatus.COMPLETED, OrderStatus.CANCELLED],
  [OrderStatus.COMPLETED]: [],
  [OrderStatus.CANCELLED]: [],
  [OrderStatus.EXPIRED]: [],
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      setOrder(data);
    } catch {
      router.push("/admin/orders");
    } finally {
      setLoading(false);
    }
  }, [params.id, router]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  useRealtime(
    [
      EventChannels.ORDER_UPDATED,
      EventChannels.orderStatus(String(params.id)),
      EventChannels.orderPayment(String(params.id)),
    ],
    {
      intervalMs: 10000,
      onEvent: () => void load(),
      onPoll: () => void load(),
    },
  );

  const updateStatus = useCallback(
    async (newStatus: OrderStatus) => {
      if (!order) return;
      setUpdating(true);
      try {
        const res = await fetch(`/api/orders/${order._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (res.ok) {
          const updated = await res.json();
          setOrder(updated);
        }
      } catch (err) {
        console.error("Failed to update status:", err);
      } finally {
        setUpdating(false);
      }
    },
    [order],
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (!order) return null;

  const nextStatuses = STATUS_TRANSITIONS[order.status] ?? [];

  return (
    <div className="max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => router.push("/admin/orders")}
            className="text-sm text-neutral-500 hover:text-white mb-2 transition-colors"
          >
            ← Orders
          </button>
          <h1 className="text-2xl font-bold font-mono">
            {order.invoiceNumber}
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Created {new Date(order.createdAt).toLocaleString("id-ID")}
          </p>
        </div>
        <span
          className={`inline-block self-start px-4 py-2 rounded-full text-sm font-medium ${
            order.status === OrderStatus.COMPLETED
              ? "bg-green-500/20 text-green-400"
              : order.status === OrderStatus.CANCELLED
                ? "bg-red-500/20 text-red-400"
                : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      {/* Status Controls */}
      {nextStatuses.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {nextStatuses.map((status) => (
            <button
              key={status}
              onClick={() => updateStatus(status)}
              disabled={updating}
              className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors disabled:opacity-50"
            >
              Mark as {STATUS_LABELS[status] ?? status}
            </button>
          ))}
        </div>
      )}

      {/* Buyer Info */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-4">
          Buyer Information
        </h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3 text-sm">
          <Row label="Name" value={order.buyer.name} />
          <Row label="Email" value={order.buyer.email} />
          <Row label="Phone" value={order.buyer.phone} />
          <Row
            label="Source"
            value={
              order.source === "CASHIER"
                ? `Kasir${order.cashierName ? ` · ${order.cashierName}` : ""}`
                : `Online · ${
                    order.shipping.method === ShippingMethod.DELIVERY
                      ? "Delivery"
                      : "Pickup"
                  }`
            }
          />
        </div>
      </section>

      {/* Shipping Info */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-4">
          Shipping Information
        </h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3 text-sm">
          <Row
            label="Method"
            value={
              order.shipping.method === ShippingMethod.DELIVERY
                ? "Delivery"
                : "Pickup"
            }
          />
          {order.shipping.receiverName && (
            <Row label="Receiver" value={order.shipping.receiverName} />
          )}
          {order.shipping.phone && (
            <Row label="Phone" value={order.shipping.phone} />
          )}
          {order.shipping.province && (
            <Row label="Province" value={order.shipping.province} />
          )}
          {order.shipping.regency && (
            <Row label="Regency" value={order.shipping.regency} />
          )}
          {order.shipping.district && (
            <Row label="District" value={order.shipping.district} />
          )}
          {order.shipping.village && (
            <Row label="Village" value={order.shipping.village} />
          )}
          {order.shipping.address && (
            <Row label="Address" value={order.shipping.address} />
          )}
          {order.shipping.postalCode && (
            <Row label="Postal Code" value={order.shipping.postalCode} />
          )}
          {order.shipping.note && (
            <Row label="Notes" value={order.shipping.note} />
          )}
          {order.shipping.latitude != null && order.shipping.longitude != null && (
            <div className="pt-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${order.shipping.latitude},${order.shipping.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 text-sm font-medium hover:bg-emerald-600/30 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
                Open in Google Maps
              </a>
            </div>
          )}
        </div>
      </section>

      {/* Order Items */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-4">
          Order Items
        </h2>

        {/* Bracelet Arrangement */}
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 mb-4">
          <p className="text-[11px] text-neutral-500 mb-3">Bracelet Arrangement</p>
          <div className="flex flex-wrap items-center gap-2">
            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10"
              >
                {item.image?.secureUrl && (
                  <div className="w-5 h-5 rounded overflow-hidden bg-white/5 shrink-0">
                    <Image
                      src={item.image.secureUrl}
                      alt={item.name}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                )}
                <span className="text-sm text-neutral-200">{item.name}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-4">
          {order.items.map((item, i) => (
            <div
              key={i}
              className="flex items-center gap-4 text-sm"
            >
              {item.image?.secureUrl && (
                <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden flex items-center justify-center">
                  <Image
                    src={item.image.secureUrl}
                    alt={item.name}
                    width={40}
                    height={40}
                    className="object-contain"
                  />
                </div>
              )}
              <span className="flex-1 text-neutral-300">{item.name}</span>
              <span className="text-neutral-400">x{item.qty}</span>
              <span className="font-medium">
                Rp{item.subtotal.toLocaleString("id-ID")}
              </span>
            </div>
          ))}
          <div className="pt-4 border-t border-white/10 space-y-1 text-sm">
            <div className="flex justify-between text-neutral-400">
              <span>Subtotal</span>
              <span>Rp{order.subtotal.toLocaleString("id-ID")}</span>
            </div>
            {order.shippingCost > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>Shipping</span>
                <span>Rp{order.shippingCost.toLocaleString("id-ID")}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t border-white/10">
              <span>Total</span>
              <span>Rp{order.total.toLocaleString("id-ID")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Payment */}
      <section>
        <h2 className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-4">
          Payment
        </h2>
        <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-6 space-y-3 text-sm">
          <Row label="Method" value={order.payment.method ?? "-"} />
          <Row
            label="Status"
            value={STATUS_LABELS[order.payment.status] ?? order.payment.status}
          />
          {order.payment.paidAt && (
            <Row
              label="Paid At"
              value={new Date(order.payment.paidAt).toLocaleString("id-ID")}
            />
          )}
          {order.payment.proofImage?.secureUrl && (
            <div>
              <p className="text-neutral-500 mb-2">Proof of Payment</p>
              <a
                href={order.payment.proofImage.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block"
              >
                <Image
                  src={order.payment.proofImage.secureUrl}
                  alt="Payment Proof"
                  width={200}
                  height={200}
                  className="rounded-xl border border-white/10 object-cover"
                />
              </a>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-4">
      <span className="w-28 text-neutral-500 shrink-0">{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}
