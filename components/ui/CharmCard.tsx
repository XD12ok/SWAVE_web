"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Charm } from "@/types/charm";

interface Props {
  charm: Charm;
  onSelect: (charm: Charm) => void;
}

function discountedPrice(charm: Charm): number | null {
  const d = charm.discount;
  if (!d?.enabled || !d.value) return null;
  return Math.round(charm.price - (charm.price * d.value) / 100);
}

function isDiscountActive(charm: Charm): boolean {
  const d = charm.discount;
  if (!d?.enabled) return false;
  const now = Date.now();
  if (d.startAt && new Date(d.startAt).getTime() > now) return false;
  if (d.endAt && new Date(d.endAt).getTime() < now) return false;
  return true;
}

function CountdownBadge({ endAt }: { endAt: string }) {
  const target = useMemo(() => new Date(endAt).getTime(), [endAt]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = target - now;
  if (diff <= 0) return null;

  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);

  return (
    <span className="text-[10px] text-red-400/70">
      {h > 0 ? `${h}h ` : ""}{m}m {s}s
    </span>
  );
}

export default function CharmCard({ charm, onSelect }: Props) {
  const available = (charm.stock ?? 0) - (charm.reservedStock ?? 0);
  const outOfStock = available <= 0;
  const lowStock = available > 0 && available <= 5;
  const disc = discountedPrice(charm);
  const active = isDiscountActive(charm);

  return (
    <button
      onClick={() => !outOfStock && onSelect(charm)}
      disabled={outOfStock}
      className={`group w-full rounded-xl border p-4 lg:p-2 text-left transition ${
        outOfStock
          ? "border-white/5 bg-white/[0.01] opacity-40 cursor-not-allowed"
          : "border-white/10 bg-white/[0.03] hover:border-white/30 cursor-pointer"
      }`}
    >
      <div className="aspect-square flex items-center justify-center mb-2 lg:mb-1 relative">
        <Image
          src={charm.image}
          width={200}
          height={200}
          alt={charm.name}
          className="object-contain group-hover:scale-105 transition"
        />
      </div>

      <div className="flex items-center gap-1.5 mb-1 text-left">
        <h3 className="text-base lg:text-sm font-medium">{charm.name}</h3>
        {charm.limited && (
          <span className="text-[10px] uppercase tracking-wider bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded font-medium">
            Limited
          </span>
        )}
      </div>

      {active && disc !== null ? (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm lg:text-xs text-red-400 font-semibold">
              Rp{disc.toLocaleString("id-ID")}
            </span>
            <span className="text-[11px] lg:text-[10px] line-through text-neutral-500">
              Rp{charm.price.toLocaleString("id-ID")}
            </span>
          </div>
          <span className="text-[11px] lg:text-[10px] text-amber-400">-{charm.discount!.value}%</span>
          {charm.discount?.endAt && <CountdownBadge endAt={charm.discount.endAt} />}
        </div>
      ) : (
        <p className="text-sm lg:text-xs text-neutral-400 mt-1">
          Rp{charm.price.toLocaleString("id-ID")}
        </p>
      )}

      <p
        className={`text-[11px] lg:text-[10px] mt-2 lg:mt-1 font-medium ${
          outOfStock
            ? "text-red-400"
            : lowStock
              ? "text-amber-400"
              : "text-green-400"
        }`}
      >
        {outOfStock ? "Out of Stock" : lowStock ? `Low Stock — ${available} left` : `In Stock — ${available}`}
      </p>
    </button>
  );
}
