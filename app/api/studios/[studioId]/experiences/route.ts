import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { slugify } from "@/lib/slug";
import type { ExperienceStatus, ExperienceType, ExperienceVisibility, LocationType } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string }> };

const EXPERIENCE_TYPES: ExperienceType[] = [
  "one_time_event",
  "workshop",
  "masterclass",
  "recurring_class",
  "open_session",
  "private_session",
];

const LOCATION_TYPES: LocationType[] = ["studio_address", "custom_address", "online_future"];

function parseExperienceType(v: unknown): ExperienceType | null {
  return typeof v === "string" && EXPERIENCE_TYPES.includes(v as ExperienceType) ? (v as ExperienceType) : null;
}

function parseLocationType(v: unknown): LocationType | null {
  return typeof v === "string" && LOCATION_TYPES.includes(v as LocationType) ? (v as LocationType) : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const experiences = await prisma.experience.findMany({
    where: { studioId },
    orderBy: { updatedAt: "desc" },
    include: { cancellationPolicy: true, recurringRules: true },
  });
  return NextResponse.json({ experiences });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "vendor") {
    return NextResponse.json({ error: "Vendor role required" }, { status: 403 });
  }
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const slugIn = typeof body.slug === "string" ? body.slug.trim() : "";
  const experienceType = parseExperienceType(body.experienceType);
  const locationType = parseLocationType(body.locationType);

  const durationMinutes = typeof body.durationMinutes === "number" ? body.durationMinutes : NaN;
  const capacity = typeof body.capacity === "number" ? body.capacity : NaN;
  const minimumParticipants = typeof body.minimumParticipants === "number" ? body.minimumParticipants : NaN;
  const maximumParticipants = typeof body.maximumParticipants === "number" ? body.maximumParticipants : NaN;
  const priceCents = typeof body.priceCents === "number" ? body.priceCents : NaN;

  if (!title || !experienceType || !locationType) {
    return NextResponse.json({ error: "title, experienceType, locationType required" }, { status: 400 });
  }
  if (
    !Number.isFinite(durationMinutes) ||
    durationMinutes < 1 ||
    !Number.isFinite(capacity) ||
    capacity < 1 ||
    !Number.isFinite(minimumParticipants) ||
    minimumParticipants < 1 ||
    !Number.isFinite(maximumParticipants) ||
    maximumParticipants < minimumParticipants ||
    !Number.isFinite(priceCents) ||
    priceCents < 0
  ) {
    return NextResponse.json({ error: "Invalid duration, capacity, participants, or price" }, { status: 400 });
  }

  let cancellationPolicyId: string | null = null;
  if (typeof body.cancellationPolicyId === "string" && body.cancellationPolicyId) {
    const pol = await prisma.cancellationPolicy.findFirst({
      where: { id: body.cancellationPolicyId, studioId },
    });
    if (!pol) return NextResponse.json({ error: "Invalid cancellation policy" }, { status: 400 });
    cancellationPolicyId = pol.id;
  }

  const baseSlug = slugIn ? slugify(slugIn) : slugify(title);
  let slug = baseSlug;
  let n = 0;
  while (await prisma.experience.findUnique({ where: { studioId_slug: { studioId, slug } } })) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  const status = (body.status as ExperienceStatus) || "draft";
  const allowedStatus: ExperienceStatus[] = ["draft", "active", "inactive", "archived"];
  const safeStatus = allowedStatus.includes(status) ? status : "draft";

  const visibility = (body.visibility as ExperienceVisibility) || "public";
  const safeVisibility: ExperienceVisibility[] = ["public", "private"];
  const v = safeVisibility.includes(visibility) ? visibility : "public";

  const experience = await prisma.experience.create({
    data: {
      studioId,
      title,
      slug,
      shortDescription: typeof body.shortDescription === "string" ? body.shortDescription.trim() || null : null,
      fullDescription: typeof body.fullDescription === "string" ? body.fullDescription.trim() || null : null,
      experienceType,
      category: typeof body.category === "string" ? body.category.trim() || null : null,
      skillLevel: typeof body.skillLevel === "string" ? body.skillLevel.trim() || null : null,
      durationMinutes,
      capacity,
      minimumParticipants,
      maximumParticipants,
      priceCents,
      compareAtPriceCents: typeof body.compareAtPriceCents === "number" ? body.compareAtPriceCents : null,
      currency: typeof body.currency === "string" ? body.currency.trim().toUpperCase() || "EUR" : "EUR",
      whatIsIncluded: typeof body.whatIsIncluded === "string" ? body.whatIsIncluded.trim() || null : null,
      whatToBring: typeof body.whatToBring === "string" ? body.whatToBring.trim() || null : null,
      requirements: typeof body.requirements === "string" ? body.requirements.trim() || null : null,
      restrictions: typeof body.restrictions === "string" ? body.restrictions.trim() || null : null,
      ageRestrictionNote: typeof body.ageRestrictionNote === "string" ? body.ageRestrictionNote.trim() || null : null,
      accessibilityNote: typeof body.accessibilityNote === "string" ? body.accessibilityNote.trim() || null : null,
      coverImageUrl: typeof body.coverImageUrl === "string" ? body.coverImageUrl.trim() || null : null,
      locationType,
      venueName: typeof body.venueName === "string" ? body.venueName.trim() || null : null,
      addressLine1: typeof body.addressLine1 === "string" ? body.addressLine1.trim() || null : null,
      addressLine2: typeof body.addressLine2 === "string" ? body.addressLine2.trim() || null : null,
      city: typeof body.city === "string" ? body.city.trim() || null : null,
      country: typeof body.country === "string" ? body.country.trim() || null : null,
      latitude: typeof body.latitude === "number" ? body.latitude : null,
      longitude: typeof body.longitude === "number" ? body.longitude : null,
      cancellationPolicyId,
      isFeatured: body.isFeatured === true,
      status: safeStatus,
      visibility: v,
    },
  });

  return NextResponse.json({ experience }, { status: 201 });
}