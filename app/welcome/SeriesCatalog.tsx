"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function SeriesCatalog() {
  const series = [
    {
      name: "SWAVE 01",
      title: "Classic",
      description: "Elegant stainless bracelet with premium finishing.",
      image: "/product.png",
      color: "#ffffff",
    },
    {
      name: "SWAVE 02",
      title: "Ocean",
      description: "Inspired by the calm color of the sea.",
      image: "/feature1.jpg",
      color: "#5DADE2",
    },
    {
      name: "SWAVE 03",
      title: "Forest",
      description: "Natural green edition for outdoor lovers.",
      image: "/feature2.jpg",
      color: "#58D68D",
    },
    {
      name: "SWAVE 04",
      title: "Midnight",
      description: "Dark premium edition with luxurious appearance.",
      image: "/feature3.jpg",
      color: "#8E44AD",
    },
    {
      name: "SWAVE 05",
      title: "Sunset",
      description: "Warm orange edition with modern aesthetics.",
      image: "/feature4.jpg",
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

    gsap.to(previewRef.current, {
      opacity: 0,
      y: 30,
      scale: 0.95,
      duration: 0.3,
      onComplete: () => {
        setActiveIndex(index);

        gsap.fromTo(
          previewRef.current,
          {
            opacity: 0,
            y: 30,
            scale: 1.05,
          },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.5,
          },
        );
      },
    });
  };

  useEffect(() => {
    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top top",
      end: `+=${series.length * window.innerHeight}`,
      pin: true,
      scrub: true,
      onUpdate: (self) => {
        const index = Math.round(self.progress * (series.length - 1));

        changeProduct(index);
      },
    });

    return () => trigger.kill();
  }, []);

  return (
    <section ref={sectionRef} className="relative h-[200vh]">
      <div className="sticky top-0 flex h-screen">
        {/* LEFT */}
        <div className="w-1/3 flex items-center justify-center border-r border-white/10">
          <div className="space-y-8">
            {series.map((item, index) => (
              <h2
                key={index}
                onClick={() => changeProduct(index)}
                className={`cursor-pointer transition-all duration-500 ${
                  activeIndex === index
                    ? "text-5xl font-bold text-white"
                    : "text-3xl text-neutral-500 hover:text-white"
                }`}
              >
                {item.name}
              </h2>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 flex items-center justify-center">
          <div ref={previewRef} className="text-center">
            <Image
              src={series[activeIndex].image}
              alt={series[activeIndex].title}
              width={500}
              height={500}
              className="rounded-3xl object-cover"
            />

            <h1 className="mt-8 text-5xl font-bold">
              {series[activeIndex].title}
            </h1>

            <p className="mt-4 max-w-md text-neutral-400">
              {series[activeIndex].description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
