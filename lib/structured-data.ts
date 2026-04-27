import { buildAbsoluteUrl, siteMetadata } from "@/lib/seo";

type JsonLd = Record<string, unknown>;

type BreadcrumbItem = {
  name: string;
  path?: string;
};

export function toJsonLdScript(data: JsonLd | JsonLd[]) {
  return JSON.stringify(Array.isArray(data) ? data : [data]);
}

export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.path ? { item: buildAbsoluteUrl(item.path) } : {}),
    })),
  };
}

/**
 * Comma-separated env override for Organization.sameAs (Instagram, TikTok, X, Facebook page, etc.).
 * Helps Google's knowledge panel link the brand to its social presence.
 */
function envSocialProfiles(): string[] {
  const raw = process.env.NEXT_PUBLIC_SOCIAL_PROFILES?.trim();
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && /^https?:\/\//i.test(s));
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetadata.name,
    url: siteMetadata.url,
    description: siteMetadata.description,
    /**
     * Sitelinks search box — lets Google offer in-result search to your domain.
     * Pointed at /wear/shop with `?q=` so the apparel storefront is the primary discovery surface.
     */
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteMetadata.url}/wear/shop?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteMetadata.name,
    url: siteMetadata.url,
    logo: buildAbsoluteUrl("/potterymania-icon.svg"),
    sameAs: envSocialProfiles(),
    description: siteMetadata.description,
  };
}

/** Generic itemList for category / shop listing pages so AI + Google read products as a feed. */
export function itemListJsonLd(input: {
  name: string;
  path: string;
  items: { name: string; path: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: input.name,
    url: buildAbsoluteUrl(input.path),
    numberOfItems: input.items.length,
    itemListElement: input.items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: buildAbsoluteUrl(item.path),
      name: item.name,
    })),
  };
}

export function softwareApplicationJsonLd(input: {
  name: string;
  description: string;
  path: string;
  offers: Array<{ name: string; price: number; currency?: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: input.description,
    url: buildAbsoluteUrl(input.path),
    offers: input.offers.map((offer) => ({
      "@type": "Offer",
      name: offer.name,
      price: offer.price.toFixed(2),
      priceCurrency: offer.currency ?? "EUR",
      availability: "https://schema.org/InStock",
      url: buildAbsoluteUrl(input.path),
    })),
  };
}

export function aggregateRatingJsonLd(input: { ratingValue: number; reviewCount: number }) {
  if (input.reviewCount <= 0) return undefined;
  return {
    "@type": "AggregateRating",
    ratingValue: Number(input.ratingValue.toFixed(1)),
    reviewCount: input.reviewCount,
    bestRating: 5,
    worstRating: 1,
  };
}

export function localBusinessJsonLd(input: {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
  city?: string | null;
  country?: string | null;
  addressLine1?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
  websiteUrl?: string | null;
  aggregateRating?: { ratingValue: number; reviewCount: number };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": buildAbsoluteUrl(`/studios/${input.id}`),
    name: input.name,
    description: input.description ?? undefined,
    image: input.image ?? undefined,
    url: input.websiteUrl || buildAbsoluteUrl(`/studios/${input.id}`),
    telephone: input.phone ?? undefined,
    email: input.email ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: input.addressLine1 ?? undefined,
      addressLocality: input.city ?? undefined,
      addressCountry: input.country ?? undefined,
      postalCode: input.postalCode ?? undefined,
    },
    ...(input.aggregateRating ? { aggregateRating: aggregateRatingJsonLd(input.aggregateRating) } : {}),
  };
}

export function eventJsonLd(input: {
  id: string;
  name: string;
  description: string;
  image?: string | null;
  startDate?: string;
  endDate?: string;
  locationName?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  country?: string | null;
  price: number;
  currency?: string;
  organizerName: string;
  organizerPath: string;
  aggregateRating?: { ratingValue: number; reviewCount: number };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    "@id": buildAbsoluteUrl(`/classes/${input.id}`),
    name: input.name,
    description: input.description,
    image: input.image ? [input.image] : undefined,
    startDate: input.startDate,
    endDate: input.endDate,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    location: {
      "@type": "Place",
      name: input.locationName || input.organizerName,
      address: {
        "@type": "PostalAddress",
        streetAddress: input.addressLine1 ?? undefined,
        addressLocality: input.city ?? undefined,
        addressCountry: input.country ?? undefined,
      },
    },
    offers: {
      "@type": "Offer",
      url: buildAbsoluteUrl(`/classes/${input.id}`),
      price: input.price.toFixed(2),
      priceCurrency: input.currency ?? "EUR",
      availability: "https://schema.org/InStock",
    },
    organizer: {
      "@type": "Organization",
      name: input.organizerName,
      url: buildAbsoluteUrl(input.organizerPath),
    },
    ...(input.aggregateRating ? { aggregateRating: aggregateRatingJsonLd(input.aggregateRating) } : {}),
  };
}

export function productJsonLd(input: {
  path: string;
  name: string;
  description: string;
  imageUrls: string[];
  brandName: string;
  category?: string | null;
  price: number;
  currency?: string;
  availability: "InStock" | "OutOfStock" | "PreOrder";
  aggregateRating?: { ratingValue: number; reviewCount: number };
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": buildAbsoluteUrl(input.path),
    name: input.name,
    description: input.description,
    image: input.imageUrls,
    brand: {
      "@type": "Brand",
      name: input.brandName,
    },
    category: input.category ?? undefined,
    offers: {
      "@type": "Offer",
      url: buildAbsoluteUrl(input.path),
      price: input.price.toFixed(2),
      priceCurrency: input.currency ?? "EUR",
      availability: `https://schema.org/${input.availability}`,
      itemCondition: "https://schema.org/NewCondition",
    },
    ...(input.aggregateRating ? { aggregateRating: aggregateRatingJsonLd(input.aggregateRating) } : {}),
  };
}

export function articleJsonLd(input: {
  path: string;
  headline: string;
  description: string;
  datePublished: string;
  dateModified: string;
  image?: string | null;
  authorName: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    url: buildAbsoluteUrl(input.path),
    datePublished: input.datePublished,
    dateModified: input.dateModified,
    image: input.image ? [input.image] : undefined,
    author: {
      "@type": "Organization",
      name: input.authorName,
    },
    publisher: {
      "@type": "Organization",
      name: siteMetadata.name,
      logo: {
        "@type": "ImageObject",
        url: buildAbsoluteUrl("/potterymania-icon.svg"),
      },
    },
  };
}
