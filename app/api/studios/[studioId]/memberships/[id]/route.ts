import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean))];
}

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const membership = await prisma.membership.findFirst({
    where: { id, studioId },
    include: {
      experiences: { include: { experience: { select: { id: true, title: true } } } },
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { user: { select: { id: true, email: true, customerProfile: { select: { fullName: true } } } } },
      },
    },
  });
  if (!membership) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ membership });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (studio?.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.membership.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    description?: string | null;
    imageUrl?: string | null;
    durationDays?: number;
    sessionsPerPeriod?: number | null;
    maxFutureBookings?: number | null;
    priceCents?: number;
    isRecurring?: boolean;
    recurringPriceCents?: number | null;
    isActive?: boolean;
    isVisible?: boolean;
    sortOrder?: number;
  } = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Membership name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if ("description" in body) data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  if ("imageUrl" in body) data.imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null;
  if ("durationDays" in body) {
    const v = typeof body.durationDays === "number" ? Math.floor(body.durationDays) : NaN;
    if (!Number.isFinite(v) || v < 1 || v > 3650) return NextResponse.json({ error: "durationDays must be between 1 and 3650" }, { status: 400 });
    data.durationDays = v;
  }
  if ("sessionsPerPeriod" in body) {
    data.sessionsPerPeriod =
      typeof body.sessionsPerPeriod === "number" && Number.isFinite(body.sessionsPerPeriod)
        ? Math.max(1, Math.floor(body.sessionsPerPeriod))
        : null;
  }
  if ("maxFutureBookings" in body) {
    data.maxFutureBookings =
      typeof body.maxFutureBookings === "number" && Number.isFinite(body.maxFutureBookings)
        ? Math.max(1, Math.floor(body.maxFutureBookings))
        : null;
  }
  if ("priceCents" in body) {
    const v = typeof body.priceCents === "number" ? Math.floor(body.priceCents) : NaN;
    if (!Number.isFinite(v) || v < 0) return NextResponse.json({ error: "priceCents must be a non-negative integer" }, { status: 400 });
    data.priceCents = v;
  }
  if ("isRecurring" in body) data.isRecurring = body.isRecurring === true;
  if ("recurringPriceCents" in body) {
    data.recurringPriceCents =
      typeof body.recurringPriceCents === "number" && Number.isFinite(body.recurringPriceCents)
        ? Math.max(0, Math.floor(body.recurringPriceCents))
        : null;
  }
  if ("isActive" in body) data.isActive = body.isActive === true;
  if ("isVisible" in body) data.isVisible = body.isVisible === true;
  if ("sortOrder" in body) {
    data.sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.max(0, Math.floor(body.sortOrder)) : 0;
  }

  const experienceIds = "experienceIds" in body ? normalizeExperienceIds(body.experienceIds) : null;
  if (experienceIds && experienceIds.length > 0) {
    const count = await prisma.experience.count({ where: { studioId, id: { in: experienceIds } } });
    if (count !== experienceIds.length) {
      return NextResponse.json({ error: "One or more classes are invalid for this studio" }, { status: 400 });
    }
  }

  const membership = await prisma.$transaction(async (tx) => {
    if (experienceIds) {
      await tx.membershipExperience.deleteMany({ where: { membershipId: id } });
      if (experienceIds.length > 0) {
        await tx.membershipExperience.createMany({
          data: experienceIds.map((experienceId) => ({ membershipId: id, experienceId })),
        });
      }
    }
    return tx.membership.update({
      where: { id },
      data,
      include: {
        experiences: { include: { experience: { select: { id: true, title: true } } } },
        _count: { select: { purchases: true } },
      },
    });
  });

  return NextResponse.json({ membership });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (studio?.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.membership.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.membership.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
