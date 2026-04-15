import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))];
}

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const addOns = await prisma.experienceAddOn.findMany({
    where: { studioId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      experiences: {
        select: {
          experienceId: true,
          experience: { select: { title: true } },
        },
      },
    },
  });

  return NextResponse.json({
    addOns: addOns.map((addOn) => ({
      ...addOn,
      experienceIds: addOn.experiences.map((link) => link.experienceId),
      linkedExperiences: addOn.experiences.map((link) => ({
        id: link.experienceId,
        title: link.experience.title,
      })),
    })),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const priceCents = typeof body.priceCents === "number" ? Math.floor(body.priceCents) : NaN;
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: "Valid priceCents is required" }, { status: 400 });
  }

  const currency = typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "EUR";
  if (currency !== "EUR") {
    return NextResponse.json({ error: "Only EUR add-ons are currently supported" }, { status: 400 });
  }

  const experienceIds = normalizeExperienceIds(body.experienceIds);
  if (experienceIds.length > 0) {
    const count = await prisma.experience.count({
      where: { id: { in: experienceIds }, studioId },
    });
    if (count !== experienceIds.length) {
      return NextResponse.json({ error: "One or more linked classes are invalid" }, { status: 400 });
    }
  }

  const addOn = await prisma.experienceAddOn.create({
    data: {
      studioId,
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      priceCents,
      currency,
      durationMinutesExtra:
        typeof body.durationMinutesExtra === "number" && Number.isFinite(body.durationMinutesExtra)
          ? Math.max(0, Math.min(720, Math.floor(body.durationMinutesExtra)))
          : 0,
      isActive: body.isActive !== false,
      isSelectedByDefault: body.isSelectedByDefault === true,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
          ? Math.max(0, Math.floor(body.sortOrder))
          : 0,
      maxPerBooking:
        typeof body.maxPerBooking === "number" && Number.isFinite(body.maxPerBooking)
          ? Math.max(1, Math.min(99, Math.floor(body.maxPerBooking)))
          : 1,
      ...(experienceIds.length > 0
        ? {
            experiences: {
              createMany: {
                data: experienceIds.map((experienceId) => ({ experienceId })),
              },
            },
          }
        : {}),
    },
    include: {
      experiences: {
        select: {
          experienceId: true,
          experience: { select: { title: true } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      addOn: {
        ...addOn,
        experienceIds: addOn.experiences.map((link) => link.experienceId),
        linkedExperiences: addOn.experiences.map((link) => ({
          id: link.experienceId,
          title: link.experience.title,
        })),
      },
    },
    { status: 201 },
  );
}
