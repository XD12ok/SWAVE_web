"use client";

interface Props {
  categories: string[];
  activeCategory: string;
  onCategoryChange: (category: string) => void;
  search: string;
  onSearchChange: (value: string) => void;
  sort: string;
  onSortChange: (value: string) => void;
  open?: boolean;
  onToggle?: () => void;
}

export default function CategorySidebar({
  categories,
  activeCategory,
  onCategoryChange,
  search,
  onSearchChange,
  sort,
  onSortChange,
  open,
  onToggle,
}: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      <aside
        className={`
          fixed md:sticky top-0 md:top-[100px] left-0 z-50 md:z-auto
          w-[260px] md:w-[250px] min-h-screen md:min-h-0
          bg-[#0b0b0b] md:bg-transparent
          border-r border-white/10 px-6 py-8
          flex flex-col
          transition-transform duration-300
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Search */}
        <div className="relative mb-8">
          <input
            placeholder="Search charm..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full h-11 rounded-full bg-white/[0.05] border border-white/10 px-5 pr-10 text-sm outline-none placeholder:text-neutral-500 focus:border-white/30 transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-xs"
            >
              ×
            </button>
          )}
        </div>

        {/* Sort */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-3">
            Sort By
          </p>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value)}
            className="w-full h-10 rounded-xl bg-white/[0.05] border border-white/10 px-4 text-sm outline-none text-neutral-300 focus:border-white/30 transition-colors appearance-none cursor-pointer"
          >
            <option value="default">Default</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A-Z</option>
            <option value="name-desc">Name: Z-A</option>
          </select>
        </div>

        {/* Category title */}
        <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 mb-4">
          Category
        </p>

        {/* Category list */}
        <div className="space-y-1.5">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => { onCategoryChange(item); onToggle?.(); }}
              className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${
                activeCategory === item
                  ? "bg-white text-black font-medium"
                  : "text-neutral-400 hover:bg-white/10 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
