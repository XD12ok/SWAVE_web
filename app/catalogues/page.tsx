"use client";

import { useEffect, useMemo, useState } from "react";
import { Charm } from "@/types/charm";
import CatalogueHeader from "@/components/ui/CatalogueHeader";
import CategorySidebar from "@/components/ui/CategorySidebar";
import CharmGrid from "@/components/ui/CharmGrid";
import { showToast } from "@/components/ui/Toast";

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
    id: (raw._id as string | number | undefined) ?? (raw.id as string | number),
    name: raw.name as string,
    category,
    price: raw.price as number,
    image,
    stock: (raw.stock as number) ?? 0,
    limited: (raw.limited as boolean) ?? false,
    discount: raw.discount as { enabled: boolean; value: number; startAt?: string; endAt?: string } | undefined,
  };
}

export default function CataloguesPage() {
  const [selected, setSelected] = useState<Charm[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("bracelet-selection");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeCategory, setActiveCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("default");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [charms, setCharms] = useState<Charm[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cRes, catRes] = await Promise.all([
        fetch("/api/charms"),
        fetch("/api/categories"),
      ]);

      if (cancelled) return;

      if (cRes.ok) {
        const data = await cRes.json();
        const rawList: Record<string, unknown>[] = Array.isArray(data)
          ? data
          : [];
        const mapped = rawList.length > 0 ? rawList.map(toCatalogCharm) : [];
        setCharms(mapped);
      }

      if (catRes.ok) {
        const data = await catRes.json();
        if (Array.isArray(data)) {
          let names: string[];
          if (data.length > 0 && typeof data[0] === "object") {
            names = (data as { name: string }[]).map((c) => c.name);
          } else {
            names = data as string[];
          }
          setCategories(["All", ...names.filter((n) => n !== "All")]);
        }
      }

      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("bracelet-selection", JSON.stringify(selected));
  }, [selected]);

  function addCharm(charm: Charm) {
    const count = selected.filter((c) => c.id === charm.id).length;
    if (count >= (charm.stock ?? 0)) {
      showToast("Stock tidak memadai!");
      return;
    }
    setSelected((prev) => [...prev, charm]);
  }

  function removeCharm(index: number) {
    setSelected((prev) => prev.filter((_, i) => i !== index));
  }

  const filtered = useMemo(() => {
    let result = [...charms];

    if (activeCategory !== "All") {
      result = result.filter((c) => c.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((c) => c.name.toLowerCase().includes(q));
    }

    switch (sort) {
      case "price-asc":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result.sort((a, b) => b.price - a.price);
        break;
      case "name-asc":
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "name-desc":
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
    }

    return result;
  }, [activeCategory, search, sort, charms]);

  return (
    <main className="min-h-screen bg-[#0b0b0b] text-white">
      <CatalogueHeader
        selected={selected}
        removeCharm={removeCharm}
        categoryCount={categories.length}
        onFilterClick={() => setSidebarOpen((o) => !o)}
      />

      <div className="flex pt-[60px] md:pt-[110px]">
        <CategorySidebar
          categories={categories}
          activeCategory={activeCategory}
          onCategoryChange={setActiveCategory}
          search={search}
          onSearchChange={setSearch}
          sort={sort}
          onSortChange={setSort}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen(false)}
        />

        <section className="flex-1 px-4 md:px-10 py-8">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm text-neutral-400">
              {loaded
                ? `${filtered.length} charm${filtered.length !== 1 ? "s" : ""}`
                : "Loading..."}
              {activeCategory !== "All" && (
                <span className="text-white/60">
                  {" "}· {activeCategory}
                </span>
              )}
            </p>
          </div>

          {!loaded ? (
            <div className="flex items-center justify-center py-24">
              <div className="h-8 w-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-neutral-500">
              <p className="text-lg">No charms found</p>
              <p className="text-sm mt-2">Try a different search or category</p>
            </div>
          ) : (
            <CharmGrid charms={filtered} onSelect={addCharm} />
          )}
        </section>
      </div>
    </main>
  );
}
