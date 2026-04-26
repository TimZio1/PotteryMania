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

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteMetadata.name,
    url: siteMetadata.url,
    description: siteMetadata.description,
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteMetadata.name,
    url: siteMetadata.url,
    logo: buildAbsoluteUrl("/potterymania-icon.svg"),
    sameAs: [],
    description: siteMetadata.description,
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
