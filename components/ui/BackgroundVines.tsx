"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export default function BackgroundVines() {
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);
  const [count] = useState(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? 3 : 2
  );

  useEffect(() => {
    let raf = 0;

    const update = () => {
      // semakin kecil angkanya semakin pelan
      const y = window.scrollY * 0.08;

      if (left.current)
        left.current.style.transform = `translate3d(0,-${y}px,0)`;

      if (right.current)
        right.current.style.transform = `translate3d(0,-${y}px,0)`;

      raf = 0;
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update();

    window.addEventListener("scroll", onScroll);

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-10">
      {/* LEFT */}
      <div
        ref={left}
        className="absolute left-[-12vw] top-0 w-[35vw] opacity-25 will-change-transform"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Image
            key={i}
            src="/goth.png"
            alt=""
            width={540}
            height={960}
            className="block w-full h-auto -mt-1"
            draggable={false}
            loading="lazy"
          />
        ))}
      </div>

      {/* RIGHT */}
      <div
        ref={right}
        className="absolute right-[-12vw] top-0 w-[35vw] opacity-25 will-change-transform"
      >
        {Array.from({ length: count }).map((_, i) => (
          <Image
            key={i}
            src="/goth.png"
            alt=""
            width={540}
            height={960}
            className="block w-full h-auto -mt-1"
            draggable={false}
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}
