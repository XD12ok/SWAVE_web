"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SeriesCatalog() {
  const series = [
    {
      name: "SWAVE Angel",
      title: "Angel",
      description: "",
      image: "/charm/12.png",
      color: "#ffffff",
    },
    {
      name: "SWAVE Lone Star",
      title: "Lone Star",
      description: "",
      image: "/charm/66.png",
      color: "#5DADE2",
    },
    {
      name: "SWAVE Gwen",
      title: "Gwen Stacy",
      description: "",
      image: "/charm/72.png",
      color: "#58D68D",
    },
    {
      name: "SWAVE Butterfly",
      title: "Midnight Butterfly",
      description: "",
      image: "/charm/61.png",
      color: "#8E44AD",
    },
    {
      name: "SWAVE 510",
      title: "510",
      description: "",
      image: "/charm/2.png",
      color: "#F39C12",
    },
  ];
  const [activeIndex, setActiveIndex] = useState(0);

  const activeIndexRef = useRef(0);

  const previewRef = useRef<HTMLDivElement>(null);

  const sectionRef = useRef<HTMLElement>(null);

  const changeProduct = (index: number) => {
    if (index === activeIndexRef.current) return;
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const multiplier = isMobile ? 0.6 : 1;
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: `+=${series.length * window.innerHeight * multiplier}`,
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const index = Math.round(self.progress * (series.length - 1));

        changeProduct(index);
      },
    });

    return () => trigger.kill();
  }, [series.length]);

  return (
    <section ref={sectionRef} className="relative h-[150vh]">
      <div className="sticky top-0 flex h-screen flex-col">
        <div className="pt-6 md:pt-10 text-center px-4">
          <p className="text-[10px] md:text-xs uppercase tracking-[0.4em] text-neutral-500 mb-2">— curated for you —</p>
          <h2 className="text-5xl md:text-[7rem] font-black tracking-tight leading-none">
            <span className="bg-gradient-to-r from-white via-neutral-300 to-neutral-500 bg-clip-text text-transparent">charms that you</span>
            <br className="md:hidden" />
            <span className="bg-gradient-to-r from-white via-neutral-300 to-neutral-500 bg-clip-text text-transparent"> need </span>
            <span className="text-[#9b111e]">ASAP!</span>
          </h2>
        </div>
        <div className="flex flex-1">
        {/* LEFT */}
        <div className="w-1/4 md:w-1/3 flex items-center justify-center border-r border-white/10 px-2 md:px-0">
          <div className="space-y-16 md:space-y-8">
            {series.map((item, index) => (
              <h2
                key={index}
                onClick={() => changeProduct(index)}
                className={`cursor-pointer transition-all duration-500 ${
                  activeIndex === index
                    ? "text-3xl md:text-5xl font-bold text-white"
                    : "text-xl md:text-3xl text-neutral-500 hover:text-white"
                }`}
              >
                {item.name}
              </h2>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 flex items-center justify-center">
          <div ref={previewRef} className="text-center transition-all duration-500 ease-out will-change-transform">
            <Image
              src={series[activeIndex].image}
              alt={series[activeIndex].title}
              width={500}
              height={500}
              className="rounded-3xl object-cover w-[200px] md:w-[440px] h-auto"
            />

            <h1 className="mt-3 md:mt-8 text-2xl md:text-5xl font-bold">
              {series[activeIndex].title}
            </h1>

            <p className="mt-2 md:mt-4 max-w-md text-xs md:text-base text-neutral-400">
              {series[activeIndex].description}
            </p>
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
