"use client";

import Image from "next/image";
import { Charm } from "@/types/charm";

interface Props {
  selected: Charm[];
  removeCharm: (index: number) => void;
}

export default function BraceletPreview({
  selected,
  removeCharm,
}: Props) {
  if (selected.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pb-2">
      <div className="overflow-x-auto md:overflow-visible scrollbar-hide">
        <div className="flex items-center min-w-max md:min-w-0">
          {selected.map((charm, index) => (
            <button
              type="button"
              key={index}
              onClick={() => removeCharm(index)}
              className={`relative group cursor-pointer ${
                index !== 0 ? "-ml-5 md:-ml-7" : ""
              }`}
            >
              <div className="w-20 h-20 md:w-20 md:h-20 flex items-center justify-center hover:opacity-60 transition-opacity">
                <Image
                  src={charm.image}
                  alt={charm.name}
                  width={90}
                  height={90}
                  className="object-contain w-16 h-16 md:w-[90px] md:h-[90px]"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-neutral-500">
        <span className="font-semibold text-white">{selected.length}</span>
        <span> / 18 charms — recommended 18 charms for bracelet</span>
      </div>
    </div>
  );
}
