"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const path = usePathname();

  if (path === "/welcome" || path.startsWith("/admin") || path.startsWith("/catalogues")) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-10 h-16 bg-[#0b0b0b]/80 backdrop-blur-md border-b border-white/5">
      <Link href="/welcome" className="text-lg font-serif tracking-wider text-white/80 hover:text-white transition-colors">
        SWAVE
      </Link>

      <div className="flex items-center gap-8 text-sm text-neutral-400">
        <Link
          href="/catalogues"
          className={`transition-colors hover:text-white ${path.startsWith("/catalogues") ? "text-white" : ""}`}
        >
          Catalogue
        </Link>
        <Link
          href="/checkout"
          className={`transition-colors hover:text-white ${path.startsWith("/checkout") ? "text-white" : ""}`}
        >
          Checkout
        </Link>
      </div>
    </nav>
  );
}
