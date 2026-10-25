import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Hind_Siliguri, Noto_Serif_Bengali } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/Nav.tsx";
import { Footer } from "@/components/Footer.tsx";
import { FeaturesProvider } from "@/components/features.tsx";

// Self-hosted at build time: no third-party font requests, so the CSP can stay font-src 'self'.
const body = Hind_Siliguri({ subsets: ["bengali", "latin"], weight: ["400", "500", "600", "700"], variable: "--font-hind", display: "swap" });
const head = Noto_Serif_Bengali({ subsets: ["bengali", "latin"], weight: ["600", "700"], variable: "--font-serif-bn", display: "swap" });

export const metadata: Metadata = {
  title: "Probashi AI | Check before you pay",
  description:
    "AI safety copilot for Bangladeshi migrant workers and their families. Check job offers, agencies and migration costs in Bangla before paying anyone.",
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2d4a2b" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Reading the request makes every page render per request, so Next.js can stamp
  // its scripts with the CSP nonce set in proxy.ts.
  await headers();
  return (
    <html lang="bn" className={`${body.variable} ${head.variable}`}>
      <body>
        <FeaturesProvider>
          <a className="skip-link" href="#main">মূল অংশে যান · Skip to content</a>
          <Nav />
          <main id="main">{children}</main>
          <Footer />
        </FeaturesProvider>
      </body>
    </html>
  );
}
