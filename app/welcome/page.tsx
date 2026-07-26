"use client";


import { useRef, useEffect, useState } from "react";
import Image from "next/image";
import { TextFlippingBoard } from "@/components/ui/text-flipping-board";
import BackgroundVines from "@/components/ui/BackgroundVines";
import Beams from "@/components/ui/Beams";
import Footer from "@/components/ui/Footer";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

import Link from "next/link";

import SeriesCatalog from "./SeriesCatalog";
import ASCIIText from "@/components/ui/ASCIIText";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
  const hero = useRef<HTMLDivElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const features = [
    {
      title: "",
      desc: "",
      image: "/charm/2.png",
    },
    {
      title: "",
      desc: "",
      image: "/charm/4.png",
    },
    {
      title: "",
      desc: "",
      image: "/charm/12.png",
    },
    {
      title: "",
      desc: "",
      image: "/charm/17.png",
    },
    {
      title: "",
      desc: "",
      image: "/charm/52.png",
    },
    {
      title: "",
      desc: "",
      image: "/charm/66.png",
    },
  ];

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // =========================
  // 🎬 HERO CINEMATIC
  // =========================
  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: hero.current,
          start: "top top",
          end: isMobile ? "+=500" : "+=1200",
          scrub: 0.6,
          pin: true,
        },
      });

      tl.fromTo(
        ".product",
        {
          y: 500,
          scale: 0.8,
          opacity: 0,
          force3D: true,
        },
        {
          y: 80,
          scale: 1,
          opacity: 1,
          ease: "none",
          force3D: true,
        },
      )

        .to(
          ".board",
          {
            scale: 0.9,
            opacity: 0.2,
          },
          "<",
        )

        .to(
          ".product",
          {
            scale: 1.06,
            ease: "none",
            force3D: true,
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
          end: isMobile ? "+=800" : "+=2000",
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
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Beams beamWidth={2} beamHeight={15} beamNumber={12} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={0} />
      </div>

      {/* ================= HERO ================= */}
      <section ref={hero} className="hero relative z-10 h-[100vh] md:h-[150vh]">
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <div className="board hidden md:flex absolute inset-0 items-center justify-center">
            <TextFlippingBoard text={`MEET US\nSWAVE`} />
          </div>

          <div className="md:hidden absolute inset-0 flex flex-col items-center justify-center text-center px-6 pointer-events-none">
            <p className="text-[11px] uppercase tracking-[0.3em] text-neutral-500 mb-3">— Since 2025 —</p>
            <h1 className="text-7xl font-black tracking-tighter leading-none bg-gradient-to-b from-white via-white to-neutral-600 bg-clip-text text-transparent">
              MEET US
            </h1>
            <h1 className="text-8xl font-black tracking-tighter leading-none bg-gradient-to-b from-white via-white to-neutral-600 bg-clip-text text-transparent mt-1">
              SWAVE
            </h1>
            <div className="w-12 h-[1px] bg-neutral-600 my-5" />
            <p className="text-[13px] text-neutral-400 italic leading-relaxed max-w-[260px]">
              you need cosmetic cuz you must!,<br />not cuz you want
            </p>
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-20">
            <Image
              src="/product.png"
              alt="Product"
              width={520}
              height={520}
              className="product will-change-transform w-[250px] md:w-[520px] h-auto"
            />
          </div>
        </div>
      </section>

      {/* ================= GALLERY ================= */}
      <section className="gallery relative z-10 h-[120vh] md:h-[180vh]">
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <h2
            className="
          swave-text
          absolute
          flex items-center justify-center
          w-full h-full
          opacity-10
          will-change-transform
          transform-gpu
          pointer-events-none
          "
          >
            <Image src="/swave_white.png" alt="SWAVE" width={600} height={144} className="w-[300px] md:w-[600px] h-auto" />
          </h2>

          <div className="relative w-full h-full">
            {features.map((item, index) => {
              const pos = [
                "top-[8%] left-[5%] md:top-[10%] md:left-[15%]",
                "top-[8%] right-[5%] md:top-[15%] md:right-[10%]",
                "top-[45%] left-[5%] md:top-[55%] md:left-[10%]",
                "top-[45%] right-[5%] md:top-[60%] md:right-[20%]",
                "top-[25%] left-[25%] md:top-[20%] md:left-[40%]",
                "top-[70%] right-[20%] md:top-[70%] md:right-[45%]",
              ];

              const rot = [
                "-rotate-3 md:-rotate-6",
                "rotate-2 md:rotate-3",
                "-rotate-2 md:-rotate-3",
                "rotate-3 md:rotate-6",
                "rotate-1 md:rotate-2",
                "-rotate-1 md:-rotate-2",
              ];

              return (
                <div
                  key={index}
                  className={`card absolute w-[150px] h-[200px] md:w-[330px] md:h-[370px] rounded-[16px] md:rounded-[28px] overflow-hidden bg-transparent border border-transparent ${pos[index]} ${rot[index]}`}
                >
                  <div className="relative h-full">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
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

      {/* ================= ASCII CTA ================= */}
      <section className="relative z-10 h-[55vh] md:h-screen bg-black flex flex-col items-center justify-center -mt-10 md:-mt-20">
        <div className="w-full h-[250px] md:h-[600px]">
          <ASCIIText
            text="SWAVE"
            enableWaves={true}
            asciiFontSize={isMobile ? 7 : 10}
            textFontSize={isMobile ? 250 : 350}
            planeBaseHeight={isMobile ? 7 : 10}
          />
        </div>
        <div className="text-center mt-2 md:mt-4 px-4">
          <h2 className="text-xl md:text-3xl font-bold text-white tracking-tight">CREATE YOUR OWN BRACELET NOW!</h2>
          <Link
            href="/catalogues"
            className="mt-2 md:mt-3 inline-block bg-white text-black font-semibold px-12 py-4 rounded-full text-base md:text-lg hover:bg-neutral-200 transition"
          >
            Go to Catalogue
          </Link>
        </div>
      </section>
      {/* ================= ABOUT ================= */}
      <section className="about relative z-10 min-h-[50vh] flex items-center justify-center bg-white text-black">
        <>
              {/* Content */}

              <Footer />
            </>
      </section>
    </main>
  );
}
