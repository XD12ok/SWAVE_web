"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="relative overflow-hidden rounded-t-[32px] bg-transparent text-black">
      <div className="mx-auto max-w-7xl px-4 pt-10 lg:px-8 lg:pt-12">
        {/* Top */}
        <div className="grid grid-cols-1 gap-14 md:grid-cols-3">
          {/* Left */}
          <div className="space-y-10">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">
                Premium Italian Charms
              </h2>

              <p className="mt-4 max-w-sm text-base leading-7 text-zinc-500">
                Handcrafted stainless steel bracelets designed for everyday elegance.
              </p>
            </div>

            <div>
              <a
                href="mailto:info@swave.com"
                className="text-lg text-black transition"
              >
                info@swave.com
              </a>

              <div className="mt-5 flex items-center gap-5">
                <Link
                  href="#"
                  className="text-zinc-500 transition duration-300"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>
                </Link>

                <Link
                  href="#"
                  className="text-zinc-500 transition duration-300"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </Link>

                <Link
                  href="#"
                  className="text-zinc-500 transition duration-300"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-6 text-lg font-semibold">Company</h3>

            <nav className="flex flex-col gap-4">
              {["Product", "About us", "Blog", "Contact"].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-lg text-zinc-500 transition"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-6 text-lg font-semibold">Legal</h3>

            <nav className="flex flex-col gap-4">
              {[
                "Terms of Service",
                "Privacy Policy",
                "Refund Policy",
              ].map((item) => (
                <Link
                  key={item}
                  href="#"
                  className="text-lg text-zinc-500 transition"
                >
                  {item}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        {/* Huge Text */}
        <div className="relative mt-8 flex justify-center">
          <h1
            className="
            select-none
            whitespace-nowrap
            text-[8rem]
            font-black
            leading-none
            tracking-[-0.08em]
            text-transparent
            bg-gradient-to-b
            from-zinc-950
            via-zinc-500
            to-zinc-300
            bg-clip-text
            sm:text-[10rem]
            md:text-[14rem]
            lg:text-[18rem]
            xl:text-[22rem]
          "
          >
            SWAVE
          </h1>
        </div>
      </div>
    </footer>
  );
}
