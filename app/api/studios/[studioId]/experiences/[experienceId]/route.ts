import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { slugify } from "@/lib/slug";
import type { ExperienceStatus, ExperienceType, ExperienceVisibility, LocationType, Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string; experienceId: string }> };

const EXPERIENCE_TYPES: ExperienceType[] = [
  "one_time_event",
  "workshop",
  "masterclass",
  "recurring_class",
  "open_session",
  "private_session",
];

const LOCATION_TYPES: LocationType[] = ["studio_address", "custom_address", "online_future"];

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, experienceId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const exp = await prisma.experience.findFirst({
    where: { id: experienceId, studioId },
  });
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.ExperienceUpdateInput = {};

  if (typeof body.title === "string") data.title = body.title.trim();
  if (typeof body.slug === "string") {
    const baseSlug = slugify(body.slug.trim());
    let slug = baseSlug;
    let n = 0;
    while (
      await prisma.experience.findFirst({
        where: { studioId, slug, NOT: { id: experienceId } },
      })
    ) {
      n += 1;
      slug = `${baseSlug}-${n}`;
    }
    data.slug = slug;
  }
  if (typeof body.shortDescription === "string") data.shortDescription = body.shortDescription.trim() || null;
  if (typeof body.fullDescription === "string") data.fullDescription = body.fullDescription.trim() || null;
  if (typeof body.experienceType === "string" && EXPERIENCE_TYPES.includes(body.experienceType as ExperienceType)) {
    data.experienceType = body.experienceType as ExperienceType;
  }
  if (typeof body.category === "string") data.category = body.category.trim() || null;
  if (typeof body.skillLevel === "string") data.skillLevel = body.skillLevel.trim() || null;
  if (typeof body.durationMinutes === "number" && body.durationMinutes >= 1) data.durationMinutes = body.durationMinutes;
  if (typeof body.capacity === "number" && body.capacity >= 1) data.capacity = body.capacity;
  if (typeof body.minimumParticipants === "number" && body.minimumParticipants >= 1) {
    data.minimumParticipants = body.minimumParticipants;
  }
  if (typeof body.maximumParticipants === "number" && body.maximumParticipants >= 1) {
    data.maximumParticipants = body.maximumParticipants;
  }
  if (typeof body.priceCents === "number" && body.priceCents >= 0) data.priceCents = body.priceCents;
  if (typeof body.compareAtPriceCents === "number") data.compareAtPriceCents = body.compareAtPriceCents;
  if (typeof body.currency === "string") data.currency = body.currency.trim().toUpperCase();
  if (typeof body.whatIsIncluded === "string") data.whatIsIncluded = body.whatIsIncluded.trim() || null;
  if (typeof body.whatToBring === "string") data.whatToBring = body.whatToBring.trim() || null;
  if (typeof body.requirements === "string") data.requirements = body.requirements.trim() || null;
  if (typeof body.restrictions === "string") data.restrictions = body.restrictions.trim() || null;
  if (typeof body.ageRestrictionNote === "string") data.ageRestrictionNote = body.ageRestrictionNote.trim() || null;
  if (typeof body.accessibilityNote === "string") data.accessibilityNote = body.accessibilityNote.trim() || null;
  if (typeof body.coverImageUrl === "string") data.coverImageUrl = body.coverImageUrl.trim() || null;
  if (typeof body.locationType === "string" && LOCATION_TYPES.includes(body.locationType as LocationType)) {
    data.locationType = body.locationType as LocationType;
  }
  if (typeof body.venueName === "string") data.venueName = body.venueName.trim() || null;
  if (typeof body.addressLine1 === "string") data.addressLine1 = body.addressLine1.trim() || null;
  if (typeof body.addressLine2 === "string") data.addressLine2 = body.addressLine2.trim() || null;
  if (typeof body.city === "string") data.city = body.city.trim() || null;
  if (typeof body.country === "string") data.country = body.country.trim() || null;
  if (typeof body.latitude === "number") data.latitude = body.latitude;
  if (typeof body.longitude === "number") data.longitude = body.longitude;
  if (body.isFeatured === true || body.isFeatured === false) data.isFeatured = body.isFeatured;

  const allowedStatus: ExperienceStatus[] = ["draft", "active", "inactive", "archived"];
  if (typeof body.status === "string" && allowedStatus.includes(body.status as ExperienceStatus)) {
    data.status = body.status as ExperienceStatus;
  }
  const allowedVis: ExperienceVisibility[] = ["public", "private"];
  if (typeof body.visibility === "string" && allowedVis.includes(body.visibility as ExperienceVisibility)) {
    data.visibility = body.visibility as ExperienceVisibility;
  }

  if (body.cancellationPolicyId === null) {
    data.cancellationPolicy = { disconnect: true };
  } else if (typeof body.cancellationPolicyId === "string" && body.cancellationPolicyId) {
    const pol = await prisma.cancellationPolicy.findFirst({
      where: { id: body.cancellationPolicyId, studioId },
    });
    if (!pol) return NextResponse.json({ error: "Invalid cancellation policy" }, { status: 400 });
    data.cancellationPolicy = { connect: { id: pol.id } };
  }

  const experience = await prisma.experience.update({
    where: { id: experienceId },
    data,
  });

  return NextResponse.json({ experience });
}