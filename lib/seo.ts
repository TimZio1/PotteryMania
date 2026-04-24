import type { Metadata } from "next";
import { resolvePublicSiteUrl } from "@/lib/public-site-url";

const siteUrl = resolvePublicSiteUrl();

export const siteMetadata = {
  name: "Clayense",
  description:
    "The first global network & directory for independent artists and studios.",
  url: siteUrl,
  ogImage: "/og-default.png",
  keywords: [
    "global pottery directory",
    "pottery artists directory",
    "independent pottery artists",
    "pottery studios directory",
    "pottery studio software",
    "ceramic studio software",
    "pottery class booking software",
    "sell ceramics online",
    "pottery website builder",
    "pottery studio management",
    "ceramic artist ecommerce",
  ],
};

export function buildAbsoluteUrl(path = "/") {
  return new URL(path, siteMetadata.url).toString();
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
