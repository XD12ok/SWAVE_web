"use client";

import { useState } from "react";

import { Charm } from "@/types/charm";

import charms from "@/data/charms";

import CatalogueHeader from "@/components/ui/CatalogueHeader";
import CategorySidebar from "@/components/ui/CategorySidebar";
import CharmGrid from "@/components/ui/CharmGrid";

export default function CataloguesPage() {
  const [selected, setSelected] = useState<Charm[]>([]);

  // tambah charm ke bracelet
  function addCharm(charm: Charm) {
    setSelected((prev) => [...prev, charm]);
  }

  // hapus charm dari bracelet
  function removeCharm(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <main
      className="
        min-h-screen
        bg-[#0b0b0b]
        text-white
      "
    >
      {/* HEADER + BRACELET PREVIEW */}

      <CatalogueHeader selected={selected} removeCharm={removeCharm} />

      {/* CONTENT */}

      <div
        className="
          flex
          pt-[100px]
        "
      >
        {/* LEFT FILTER */}

        <CategorySidebar />

        {/* CHARM LIST */}

        <section
          className="
            flex-1
            px-10
            py-8
          "
        >
          <CharmGrid charms={charms} onSelect={addCharm} />
        </section>
      </div>
    </main>
  );
}
