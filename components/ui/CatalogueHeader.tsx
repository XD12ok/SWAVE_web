"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import BraceletPreview from "./BracletPreview";
import { Charm } from "@/types/charm";
import { getDiscountedPrice } from "@/lib/discount";

interface Props {
  selected: Charm[];
  removeCharm: (index: number) => void;
  categoryCount?: number;
  onFilterClick?: () => void;
}

export default function CatalogueHeader({ selected, removeCharm, onFilterClick }: Props) {
  const totalPrice = useMemo(() => {
    return selected.reduce(
      (sum, c) => sum + getDiscountedPrice(c.price, c.discount),
      0,
    );
  }, [selected]);

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0b0b0b]/90 backdrop-blur border-b border-white/10 z-50 px-4 md:px-10">
      {/* Desktop: single row three-column layout */}
      <div className="hidden md:flex items-center justify-between h-[110px]">
        <Link href="/welcome" className="flex items-center">
          <Image src="/swave_white.png" alt="SWAVE" width={160} height={40} className="h-26 w-auto" />
        </Link>

        {selected.length > 0 && (
          <div className="flex flex-col items-center">
            <p className="text-xs md:text-sm text-neutral-400 mb-1 whitespace-nowrap">Chose and arrange your own charms!</p>
            <BraceletPreview selected={selected} removeCharm={removeCharm} />
          </div>
        )}

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-neutral-400">Total</p>
            <p className="text-lg font-semibold">
              Rp{totalPrice.toLocaleString("id-ID")}
            </p>
          </div>

          {selected.length > 0 && (
            <Link
              href={{
                pathname: "/checkout",
                query: { charms: selected.map((c) => c.id).join(",") },
              }}
              className="px-5 py-2.5 rounded-full bg-white text-black text-sm font-medium hover:bg-white/90 transition-colors"
            >
              Checkout
            </Link>
          )}
        </div>
      </div>

      {/* Mobile: two rows */}
      <div className="md:hidden">
        <div className="flex items-center justify-between h-[60px]">
          <div className="flex items-center gap-3">
            <button
              onClick={onFilterClick}
              className="text-neutral-400 hover:text-white text-lg p-1"
              aria-label="Toggle filters"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>

            <Link href="/welcome" className="flex items-center">
              <Image src="/swave_white.png" alt="SWAVE" width={128} height={32} className="h-16 w-auto" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-neutral-400">Total</p>
              <p className="text-sm font-semibold">
                Rp{totalPrice.toLocaleString("id-ID")}
              </p>
            </div>

            {selected.length > 0 && (
              <Link
                href={{
                  pathname: "/checkout",
                  query: { charms: selected.map((c) => c.id).join(",") },
                }}
                className="px-3 py-2 rounded-full bg-white text-black text-xs font-medium hover:bg-white/90 transition-colors"
              >
                Checkout
              </Link>
            )}
          </div>
        </div>

        {selected.length > 0 && (
          <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
            <p className="text-[10px] text-neutral-500 mb-1 whitespace-nowrap">Chose and arrange your own charms!</p>
            <BraceletPreview selected={selected} removeCharm={removeCharm} />
          </div>
        )}
      </div>
    </header>
  );
}
