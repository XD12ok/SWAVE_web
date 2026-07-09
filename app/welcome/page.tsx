"use client";

import { useRef } from "react";
import Image from "next/image";
import { TextFlippingBoard } from "@/components/ui/text-flipping-board";
import BackgroundVines from "@/components/ui/BackgroundVines";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import SeriesCatalog from "./SeriesCatalog";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
  const hero = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const features = [
    {
      title: "Stainless material",
      desc: "Anti rust material.",
      image: "/feature1.jpg",
    },
    {
      title: "Premium look",
      desc: "Makes you look nicer.",
      image: "/feature2.jpg",
    },
    {
      title: "High Durability",
      desc: "High grade material",
      image: "/feature3.jpg",
    },
    {
      title: "Water Resistant",
      desc: "Designed for everyday use.",
      image: "/feature4.jpg",
    },
    {
      title: "Flexibel band",
      desc: "Fit in every hand.",
      image: "/feature5.jpg",
    },
    {
      title: "Minimal Design",
      desc: "Modern and elegant.",
      image: "/feature6.jpg",
    },
  ];

  // =========================
  // 🎬 HERO CINEMATIC
  // =========================
  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero.current,
          start: "top top",
          end: "+=1200",
          scrub: 1,
          pin: true,
        },
      });

      tl.fromTo(
        ".product",
        {
          y: 800,
          scale: 0.8,
          opacity: 0,
          rotate: -15,
        },
        {
          y: 80,
          scale: 1,
          opacity: 1,
          rotate: 0,
          ease: "power3.out",
        },
      )

        .to(
          ".board",
          {
            scale: 0.9,
            opacity: 0.2,
            filter: "blur(10px)",
          },
          "<",
        )

        .to(
          ".product",
          {
            scale: 1.12,
            ease: "power2.out",
          },
          "-=0.3",
        );
    },
    { scope: container },
  );

  // =========================
  // 🎬 GALLERY CINEMATIC (SWAVE)
  // =========================
  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>(".card");
      const swave = document.querySelector(".swave-text");

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: ".gallery",
          start: "top top",
          end: "+=2000",
          scrub: 1,
          pin: true,
        },
      });

      // SWAVE depth
      tl.to(
        swave,
        {
          scale: 0.85,
          opacity: 0.1,
          filter: "blur(6px)",
        },
        0,
      );

      // cards reveal cinematic
      tl.fromTo(
        cards,
        {
          opacity: 0,
          y: 400,
          scale: 0.6,
          rotate: (i) => (i % 2 === 0 ? -12 : 12),
        },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          rotate: 0,
          stagger: 0.12,
          ease: "power3.out",
        },
        0.2,
      );

      // breath finish
      tl.to(
        cards,
        {
          scale: 1.05,
          stagger: 0.05,
          ease: "power2.out",
        },
        ">-0.3",
      );
    },
    { scope: container },
  );

  // =========================
  // 🎬 ABOUT REVEAL
  // =========================
  useGSAP(
    () => {
      gsap.from(".about", {
        yPercent: 20,
        opacity: 0,
        duration: 1,
        ease: "power2.out",
        scrollTrigger: {
          trigger: ".about",
          start: "top 80%",
        },
      });
    },
    { scope: container },
  );

  console.log(ScrollTrigger.getAll());
  return (
    <main
      ref={container}
      className="relative bg-black text-white overflow-x-hidden"
    >
      <BackgroundVines />

      {/* ================= HERO ================= */}
      <section ref={hero} className="hero relative z-10 h-[150vh]">
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <div className="board absolute inset-0 flex items-center justify-center">
            <TextFlippingBoard text={`MEET US\nSWAVE`} />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-20">
            <Image
              src="/product.png"
              alt="Product"
              width={520}
              height={520}
              className="product will-change-transform"
            />
          </div>
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="gallery relative z-10 h-[180vh]">
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <h2
            className="
          swave-text
          absolute
          text-[150px]
          font-bold
          tracking-[0.3em]
          opacity-10
          will-change-transform
          transform-gpu
          "
          >
            SWAVE
          </h2>

          <div className="relative w-full h-full">
            {features.map((item, index) => {
              const pos = [
                "top-[10%] left-[15%]",
                "top-[15%] right-[10%]",
                "top-[55%] left-[10%]",
                "top-[60%] right-[20%]",
                "top-[20%] left-[40%]",
                "top-[70%] right-[45%]",
              ];

              const rot = [
                "-rotate-6",
                "rotate-3",
                "-rotate-3",
                "rotate-6",
                "rotate-2",
                "-rotate-2",
              ];

              return (
                <div
                  key={index}
                  className={`card absolute w-[330px] h-[370px] rounded-[28px] overflow-hidden bg-neutral-900 border border-white/10 ${pos[index]} ${rot[index]}`}
                >
                  <div className="relative h-[220px]">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="p-4">
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="text-sm text-neutral-400 mt-2">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= SERIES ================= */}
      <section className="relative z-10">
        <SeriesCatalog />
      </section>
      {/* ================= ABOUT ================= */}
      <section className="about relative z-10 h-screen flex items-center justify-center bg-white text-black rounded-t-[80px]">
        <div className="text-center max-w-4xl">
          <h1 className="text-6xl font-bold">About SWAVE</h1>
          <p className="mt-6 text-lg text-neutral-500">
            Cinematic scroll experience with GSAP
          </p>
        </div>
      </section>
    </main>
  );
}
