import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { siteMetadata } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#fafaf9",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.url),
  title: {
    default: "PotteryMania",
    template: "%s | PotteryMania",
  },
  description: siteMetadata.description,
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "PotteryMania" },
  openGraph: {
    title: "PotteryMania",
    description: siteMetadata.description,
    siteName: siteMetadata.name,
    url: siteMetadata.url,
    images: [{ url: siteMetadata.ogImage }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PotteryMania",
    description: siteMetadata.description,
    images: [siteMetadata.ogImage],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} bg-stone-50 font-sans text-stone-900 antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}