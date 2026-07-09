"use client";

import Image from "next/image";
import { Charm } from "@/types/charm";

interface Props {
  selected: Charm[];
  removeCharm: (index: number) => void;
}

export default function BraceletPreview({ selected, removeCharm }: Props) {
  return (
    <div
      className="
relative

flex
gap-3

items-center

"
    >
      {selected.map((charm, index) => (
        <div
          key={index}

          className="
relative

group

w-16
h-16
"
        >
          <Image
            src={charm.image}
            alt={charm.name}

            fill

            className="
object-contain
"
          />

          <button
            onClick={() => removeCharm(index)}

            className="
absolute

-right-2
-top-2

w-5
h-5

rounded-full

bg-white

text-black

text-xs

opacity-0

group-hover:opacity-100

transition
"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
