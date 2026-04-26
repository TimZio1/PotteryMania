import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { GoogleAnalytics } from "@/components/google-analytics";
import { MetaPixel } from "@/components/meta-pixel";
import { CookieConsentBanner } from "@/components/cookie-consent-banner";
import { BRAND_ICON_PUBLIC_PATH } from "@/lib/brand";
import { defaultPublicTitle, siteMetadata } from "@/lib/seo";

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
  themeColor: "#0E0E0E",
};

export const metadata: Metadata = {
  metadataBase: new URL(siteMetadata.url),
  title: {
    default: defaultPublicTitle(),
    template: "%s | PotteryMania",
  },
  description: siteMetadata.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: BRAND_ICON_PUBLIC_PATH, type: "image/svg+xml" }],
    apple: [{ url: BRAND_ICON_PUBLIC_PATH }],
  },
  appleWebApp: { capable: true, title: "PotteryMania" },
  openGraph: {
    title: defaultPublicTitle(),
    description: siteMetadata.description,
    siteName: siteMetadata.name,
    url: siteMetadata.url,
    images: [{ url: siteMetadata.ogImage }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultPublicTitle(),
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
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://image.spreadshirtmedia.net" />
        <link rel="preconnect" href="https://productionproductimage.spreadshirtmedia.net" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} font-sans text-[var(--foreground)] antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only fixed left-4 top-4 z-200 rounded-[var(--radius-button)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
        >
          Skip to content
        </a>
        <GoogleAnalytics />
        <MetaPixel />
        <Providers>
          <div id="main-content">{children}</div>
          <CookieConsentBanner />
        </Providers>
      </body>
    </html>
  );
}