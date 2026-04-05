import type { ExperienceType, Prisma } from "@prisma/client";
import { haversineKm, parseNearQueryFromParams, type NearQuery } from "@/lib/geo";

export type { NearQuery };

const EXPERIENCE_TYPES: ExperienceType[] = [
  "one_time_event",
  "workshop",
  "masterclass",
  "recurring_class",
  "open_session",
  "private_session",
];

function pickString(sp: Record<string, string | string[] | undefined>, key: string): string {
  const v = sp[key];
  return typeof v === "string" ? v.trim() : "";
}

function parseEuroToCents(s: string): number | undefined {
  if (!s) return undefined;
  const n = Number(s.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.min(1_000_000_00, Math.floor(n * 100));
}

export type ClassesDiscoveryFilters = {
  q: string;
  country: string;
  city: string;
  category: string;
  skillLevel: string;
  experienceType: ExperienceType | "";
  minPriceCents?: number;
  maxPriceCents?: number;
  slotFrom?: string;
  slotTo?: string;
  openSpotsOnly: boolean;
  /** When set, results are filtered and sorted by distance (see `GEO_SCAN_LIMIT`). */
  near?: NearQuery;
};

export function parseClassesSearchParams(
  sp: Record<string, string | string[] | undefined>
): ClassesDiscoveryFilters {
  const typeRaw = pickString(sp, "type");
  const experienceType = EXPERIENCE_TYPES.includes(typeRaw as ExperienceType)
    ? (typeRaw as ExperienceType)
    : "";

  const minPriceCents = parseEuroToCents(pickString(sp, "minPrice"));
  const maxPriceCents = parseEuroToCents(pickString(sp, "maxPrice"));

  const near = parseNearQueryFromParams(sp) ?? undefined;

  return {
    q: pickString(sp, "q"),
    country: pickString(sp, "country"),
    city: pickString(sp, "city"),
    category: pickString(sp, "category"),
    skillLevel: pickString(sp, "skill"),
    experienceType,
    minPriceCents,
    maxPriceCents,
    slotFrom: pickString(sp, "from"),
    slotTo: pickString(sp, "to"),
    openSpotsOnly: pickString(sp, "spots") === "open",
    near,
  };
}

export function buildExperienceDiscoverWhere(f: ClassesDiscoveryFilters): Prisma.ExperienceWhereInput {
  const and: Prisma.ExperienceWhereInput[] = [
    { status: "active" },
    { visibility: "public" },
    { studio: { status: "approved" } },
  ];

  if (f.q) {
    and.push({
      OR: [
        { title: { contains: f.q, mode: "insensitive" } },
        { shortDescription: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }

  if (f.country) {
    and.push({
      studio: { country: { contains: f.country, mode: "insensitive" } },
    });
  }

  if (f.city) {
    and.push({
      OR: [
        { studio: { city: { contains: f.city, mode: "insensitive" } } },
        { city: { contains: f.city, mode: "insensitive" } },
      ],
    });
  }

  if (f.category) {
    and.push({ category: { contains: f.category, mode: "insensitive" } });
  }

  if (f.skillLevel) {
    and.push({ skillLevel: { equals: f.skillLevel, mode: "insensitive" } });
  }

  if (f.experienceType) {
    and.push({ experienceType: f.experienceType });
  }

  if (f.minPriceCents != null) {
    and.push({ priceCents: { gte: f.minPriceCents } });
  }
  if (f.maxPriceCents != null) {
    and.push({ priceCents: { lte: f.maxPriceCents } });
  }

  const hasDateFrom = /^\d{4}-\d{2}-\d{2}$/.test(f.slotFrom ?? "");
  const hasDateTo = /^\d{4}-\d{2}-\d{2}$/.test(f.slotTo ?? "");

  if (f.openSpotsOnly || hasDateFrom || hasDateTo) {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const slotWhere: Prisma.BookingSlotWhereInput = {
      status: f.openSpotsOnly ? "open" : { in: ["open", "full"] },
    };

    const slotDate: Prisma.DateTimeFilter = {};
    if (hasDateFrom) slotDate.gte = new Date(`${f.slotFrom}T00:00:00.000Z`);
    if (hasDateTo) slotDate.lte = new Date(`${f.slotTo}T23:59:59.999Z`);

    if (f.openSpotsOnly) {
      const fromCandidate = slotDate.gte ? new Date(slotDate.gte as Date) : startOfToday;
      slotDate.gte = fromCandidate < startOfToday ? startOfToday : fromCandidate;
    }

    if (Object.keys(slotDate).length > 0) {
      slotWhere.slotDate = slotDate;
    } else if (f.openSpotsOnly) {
      slotWhere.slotDate = { gte: startOfToday };
    }

    and.push({ bookingSlots: { some: slotWhere } });
  }

  return { AND: and };
}

/** Max rows loaded from DB before in-memory distance filter (near-me). */
export const GEO_SCAN_LIMIT = 400;

export function experienceMeetingPoint(e: {
  latitude: number | null;
  longitude: number | null;
  studio: { latitude: number | null; longitude: number | null };
}): { lat: number; lng: number } | null {
  if (e.latitude != null && e.longitude != null) return { lat: e.latitude, lng: e.longitude };
  if (e.studio.latitude != null && e.studio.longitude != null) {
    return { lat: e.studio.latitude, lng: e.studio.longitude };
  }
  return null;
}

export function filterRowsByNearKm<T>(
  rows: T[],
  near: NearQuery,
  getPoint: (row: T) => { lat: number; lng: number } | null,
): T[] {
  return rows
    .map((row) => {
      const p = getPoint(row);
      if (!p) return null;
      const km = haversineKm(near.lat, near.lng, p.lat, p.lng);
      if (km > near.radiusKm) return null;
      return { row, km };
    })
    .filter((x): x is { row: T; km: number } => x != null)
    .sort((a, b) => a.km - b.km)
    .map((x) => x.row);
}

export type StudiosDiscoveryFilters = {
  q: string;
  country: string;
  city: string;
  hasPublicClasses: boolean;
  near?: NearQuery;
};

export function parseStudiosSearchParams(
  sp: Record<string, string | string[] | undefined>
): StudiosDiscoveryFilters {
  const near = parseNearQueryFromParams(sp) ?? undefined;
  return {
    q: pickString(sp, "q"),
    country: pickString(sp, "country"),
    city: pickString(sp, "city"),
    hasPublicClasses: pickString(sp, "offer") === "classes",
    near,
  };
}

export function buildStudioDiscoverWhere(f: StudiosDiscoveryFilters): Prisma.StudioWhereInput {
  const and: Prisma.StudioWhereInput[] = [{ status: "approved" }];

  if (f.q) {
    and.push({
      OR: [
        { displayName: { contains: f.q, mode: "insensitive" } },
        { city: { contains: f.q, mode: "insensitive" } },
        { shortDescription: { contains: f.q, mode: "insensitive" } },
      ],
    });
  }

  if (f.country) {
    and.push({ country: { contains: f.country, mode: "insensitive" } });
  }

  if (f.city) {
    and.push({ city: { contains: f.city, mode: "insensitive" } });
  }

  if (f.hasPublicClasses) {
    and.push({
      experiences: {
        some: { status: "active", visibility: "public" },
      },
    });
  }

  return { AND: and };
}

function titleCaseWords(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const DISCOVER_EXPERIENCE_TYPE_OPTIONS = EXPERIENCE_TYPES.map((v) => ({
  value: v,
  label: titleCaseWords(v),
}));

function appendNearParams(p: URLSearchParams, near: NearQuery | undefined): void {
  if (!near) return;
  p.set("lat", String(near.lat));
  p.set("lng", String(near.lng));
  if (near.radiusKm !== 50) p.set("radius", String(near.radiusKm));
}

/** Query string for `/studios` (no leading `?`). Preserves filters and optional sort. */
export function buildStudiosSearchString(f: StudiosDiscoveryFilters, sort?: string): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.country) p.set("country", f.country);
  if (f.city) p.set("city", f.city);
  if (f.hasPublicClasses) p.set("offer", "classes");
  appendNearParams(p, f.near);
  if (sort === "name") p.set("sort", "name");
  return p.toString();
}

/** Query string for `/classes` (no leading `?`). */
export function buildClassesSearchString(f: ClassesDiscoveryFilters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.country) p.set("country", f.country);
  if (f.city) p.set("city", f.city);
  if (f.category) p.set("category", f.category);
  if (f.skillLevel) p.set("skill", f.skillLevel);
  if (f.experienceType) p.set("type", f.experienceType);
  if (f.minPriceCents != null) p.set("minPrice", String(f.minPriceCents / 100));
  if (f.maxPriceCents != null) p.set("maxPrice", String(f.maxPriceCents / 100));
  if (f.slotFrom && /^\d{4}-\d{2}-\d{2}$/.test(f.slotFrom)) p.set("from", f.slotFrom);
  if (f.slotTo && /^\d{4}-\d{2}-\d{2}$/.test(f.slotTo)) p.set("to", f.slotTo);
  if (f.openSpotsOnly) p.set("spots", "open");
  appendNearParams(p, f.near);
  return p.toString();
}
