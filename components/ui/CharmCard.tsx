"use client";

import Image from "next/image";
import { Charm } from "@/types/charm";

interface Props {
  charm: Charm;
  onSelect: (charm: Charm) => void;
}

export default function CharmCard({ charm, onSelect }: Props) {
  return (
    <button
      onClick={() => onSelect(charm)}

      className="
group

w-full

rounded-xl

border
border-white/10

bg-white/[0.03]

p-4

transition

hover:border-white/30

"
    >
      <div
        className="
aspect-square

flex
items-center
justify-center

mb-3

"
      >
        <Image
          src={charm.image}

          width={120}

          height={120}

          alt={charm.name}

          className="
object-contain
group-hover:scale-105
transition
"
        />
      </div>

      <h3
        className="
text-sm
font-medium
"
      >
        {charm.name}
      </h3>

      <p
        className="
text-xs
text-neutral-400
mt-1
"
      >
        Rp{charm.price.toLocaleString("id-ID")}
      </p>
    </button>
  );
}
