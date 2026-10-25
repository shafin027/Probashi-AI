import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav.tsx";
import { Footer } from "@/components/Footer.tsx";

export const metadata: Metadata = {
  title: "Probashi AI | Check before you pay",
  description:
    "AI safety copilot for Bangladeshi migrant workers and their families. Check job offers, agencies and migration costs in Bangla before paying anyone.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#2d4a2b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="bn">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700&family=Noto+Serif+Bengali:wght@600;700&display=swap"
        />
      </head>
      <body>
        <Nav />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
