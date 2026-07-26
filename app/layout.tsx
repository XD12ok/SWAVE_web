import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { cn } from "@/lib/utils";

import { SpeedInsights } from "@vercel/speed-insights/next";

import Navbar from "@/components/ui/Navbar";
import InitialLoader from "./InitialLoader";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SWAVE — Italian Charm Bracelets",
  description:
    "Premium Italian charm bracelets. Build your own unique bracelet with handcrafted charms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-coolvetica",
        jetbrainsMono.variable,
      )}
    >
      <body className="min-h-full flex flex-col bg-black">
        <Navbar />
        <InitialLoader>{children}</InitialLoader>
        <SpeedInsights />
      </body>
    </html>
  );
}
