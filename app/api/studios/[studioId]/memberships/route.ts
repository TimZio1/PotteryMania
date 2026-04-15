import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string }> };

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean))];
}

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const memberships = await prisma.membership.findMany({
    where: { studioId },
    orderBy: [{ isActive: "desc" }, { isVisible: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: {
      experiences: { include: { experience: { select: { id: true, title: true } } } },
      _count: { select: { purchases: true } },
    },
  });
  return NextResponse.json({ memberships });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (studio?.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Membership name is required" }, { status: 400 });
  const durationDays = typeof body.durationDays === "number" ? Math.floor(body.durationDays) : NaN;
  if (!Number.isFinite(durationDays) || durationDays < 1 || durationDays > 3650) {
    return NextResponse.json({ error: "durationDays must be between 1 and 3650" }, { status: 400 });
  }
  const priceCents = typeof body.priceCents === "number" ? Math.floor(body.priceCents) : NaN;
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: "priceCents must be a non-negative integer" }, { status: 400 });
  }
  const experienceIds = normalizeExperienceIds(body.experienceIds);
  if (experienceIds.length === 0) {
    return NextResponse.json({ error: "Select at least one class for this membership" }, { status: 400 });
  }
  const count = await prisma.experience.count({
    where: { studioId, id: { in: experienceIds } },
  });
  if (count !== experienceIds.length) {
    return NextResponse.json({ error: "One or more classes are invalid for this studio" }, { status: 400 });
  }

  const membership = await prisma.membership.create({
    data: {
      studioId,
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      durationDays,
      sessionsPerPeriod:
        typeof body.sessionsPerPeriod === "number" && Number.isFinite(body.sessionsPerPeriod)
          ? Math.max(1, Math.floor(body.sessionsPerPeriod))
          : null,
      maxFutureBookings:
        typeof body.maxFutureBookings === "number" && Number.isFinite(body.maxFutureBookings)
          ? Math.max(1, Math.floor(body.maxFutureBookings))
          : null,
      priceCents,
      currency: "EUR",
      isRecurring: body.isRecurring === true,
      recurringPriceCents:
        typeof body.recurringPriceCents === "number" && Number.isFinite(body.recurringPriceCents)
          ? Math.max(0, Math.floor(body.recurringPriceCents))
          : null,
      isActive: body.isActive !== false,
      isVisible: body.isVisible !== false,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.max(0, Math.floor(body.sortOrder)) : 0,
      experiences: {
        create: experienceIds.map((experienceId) => ({ experienceId })),
      },
    },
    include: {
      experiences: { include: { experience: { select: { id: true, title: true } } } },
      _count: { select: { purchases: true } },
    },
  });

  return NextResponse.json({ membership }, { status: 201 });
}
