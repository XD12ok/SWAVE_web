"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

export default function BackgroundVines() {
  const left = useRef<HTMLDivElement>(null);
  const right = useRef<HTMLDivElement>(null);

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

  const COUNT = 3;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* LEFT */}
      <div
        ref={left}
        className="absolute left-[-12vw] top-0 w-[35vw] opacity-30"
      >
        {Array.from({ length: COUNT }).map((_, i) => (
          <Image
            key={i}
            src="/goth.png"
            alt=""
            width={300}
            height={3800}
            className="block w-full h-auto -mt-1"
            draggable={false}
          />
        ))}
      </div>

      {/* RIGHT */}
      <div
        ref={right}
        className="absolute right-[-12vw] top-0 w-[35vw] opacity-30"
      >
        {Array.from({ length: COUNT }).map((_, i) => (
          <Image
            key={i}
            src="/goth.png"
            alt=""
            width={300}
            height={3800}
            className="block w-full h-auto -mt-1"
            draggable={false}
          />
        ))}
      </div>
    </div>
  );
}
