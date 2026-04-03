import type { Metadata } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";

export const siteMetadata = {
  name: "PotteryMania",
  description: "Ceramics marketplace and class booking for independent studios.",
  url: siteUrl,
  ogImage: "/og-default.png",
};

export function buildMetadata(input: {
  title: string;
  description: string;
  path?: string;
  image?: string;
}): Metadata {
  const url = new URL(input.path || "/", siteMetadata.url).toString();
  const image = input.image || siteMetadata.ogImage;
  return {
    title: input.title,
    description: input.description,
    alternates: { canonical: url },
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
