import type { Metadata } from "next";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

const siteUrl = resolvePublicSiteUrl();

const FULL_DESCRIPTION =
  "Apparel for makers, printed on demand — and tools for independent pottery studios to get discovered, take bookings, and sell work.";

const APPAREL_DESCRIPTION =
  "Shop T-shirts, hoodies, and apparel for potters, artists, makers, and creative people. Join our affiliate program and share the culture.";

const FULL_KEYWORDS = [
  "maker apparel",
  "on demand printing",
  "pottery studio merch",
  "independent pottery artists",
  "pottery studios directory",
  "pottery studio software",
  "ceramic studio software",
  "pottery class booking software",
  "sell ceramics online",
  "pottery website builder",
  "pottery studio management",
  "ceramic artist ecommerce",
] as const;

const APPAREL_KEYWORDS = [
  "maker t-shirts",
  "potter apparel",
  "artist hoodies",
  "print on demand shirts",
  "studio merch",
  "creative apparel",
  "affiliate apparel program",
  "PotteryMania shop",
] as const;

export const siteMetadata = {
  name: "PotteryMania",
  get description() {
    return isApparelOnlyLaunch() ? APPAREL_DESCRIPTION : FULL_DESCRIPTION;
  },
  url: siteUrl,
  ogImage: "/og-default.png",
  get keywords() {
    return [...(isApparelOnlyLaunch() ? APPAREL_KEYWORDS : FULL_KEYWORDS)];
  },
};

export function buildAbsoluteUrl(path = "/") {
  return new URL(path, siteMetadata.url).toString();
}

export function defaultPublicTitle(): string {
  return isApparelOnlyLaunch() ? "PotteryMania — T-Shirts & Apparel for Makers" : "PotteryMania";
}

function envVerification() {
  const google = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim();
  const bing = process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION?.trim();
  const yandex = process.env.NEXT_PUBLIC_YANDEX_SITE_VERIFICATION?.trim();
  if (!google && !bing && !yandex) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(bing ? { other: { "msvalidate.01": bing } } : {}),
    ...(yandex ? { yandex } : {}),
  };
}

export function buildMetadata(input: {
  title: string;
  description: string;
  path?: string;
  image?: string;
  keywords?: string[];
  robots?: Metadata["robots"];
  alternates?: Metadata["alternates"];
}): Metadata {
  const url = buildAbsoluteUrl(input.path || "/");
  const image = input.image || siteMetadata.ogImage;
  return {
    title: input.title,
    description: input.description,
    keywords: [...siteMetadata.keywords, ...(input.keywords ?? [])],
    robots: input.robots,
    verification: envVerification(),
    alternates: {
      canonical: url,
      languages: {
        "x-default": url,
        en: url,
      },
      ...(input.alternates ?? {}),
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url,
      siteName: siteMetadata.name,
      images: [{ url: image }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [image],
    },
  };
}
