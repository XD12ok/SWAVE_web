"use client";

import BraceletPreview from "./BracletPreview";
import { Charm } from "@/types/charm";

interface Props {
  selected: Charm[];
  removeCharm: (index: number) => void;
}

export default function CatalogueHeader({ selected, removeCharm }: Props) {
  return (
    <header
      className="
        fixed
        top-0
        left-0
        right-0

        h-[100px]

        bg-[#0b0b0b]/90
        backdrop-blur

        border-b
        border-white/10

        z-50

        flex
        items-center
        justify-between

        px-10
      "
    >
      {/* Logo */}

      <div
        className="
        text-2xl
        font-serif
      "
      >
        Charmé
      </div>

      {/* Preview */}

      <BraceletPreview selected={selected} removeCharm={removeCharm} />

      {/* Price */}

      <div>
        <p
          className="
          text-xs
          text-neutral-400
        "
        >
          Total
        </p>

        <p
          className="
          text-lg
          font-semibold
        "
        >
          Rp250.000
        </p>
      </div>
    </header>
  );
}
