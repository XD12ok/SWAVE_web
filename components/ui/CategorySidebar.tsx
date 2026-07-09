"use client";

import { useState } from "react";

export default function CategorySidebar() {
  const categories = ["Flower", "Animal", "Anime", "Love", "Food", "Custom"];

  const [active, setActive] = useState("Flower");

  return (
    <aside
      className="
        w-[230px]

        min-h-screen

        border-r
        border-white/10

        px-6
        py-8

        flex
        flex-col
      "
    >
      {/* Search */}

      <div className="relative mb-10">
        <input
          placeholder="Search charm..."

          className="
            w-full

            h-11

            rounded-full

            bg-white/[0.05]

            border
            border-white/10

            px-5

            text-sm

            outline-none

            placeholder:text-neutral-500

            focus:border-white/30

          "
        />
      </div>

      {/* Category title */}

      <p
        className="
          text-xs
          uppercase
          tracking-[0.3em]
          text-neutral-500
          mb-5
        "
      >
        Category
      </p>

      {/* Category list */}

      <div
        className="
          space-y-2
        "
      >
        {categories.map((item) => (
          <button
            key={item}

            onClick={() => setActive(item)}

            className={`
                w-full

                text-left

                px-4
                py-3

                rounded-xl

                text-sm

                transition-all

                ${
                  active === item
                    ? "bg-white text-black"
                    : "text-neutral-400 hover:bg-white/10 hover:text-white"
                }

              `}
          >
            {item}
          </button>
        ))}
      </div>
    </aside>
  );
}
