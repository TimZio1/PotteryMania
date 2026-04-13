import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))];
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const packages = await prisma.classPackage.findMany({
    where: { studioId },
    orderBy: [{ isActive: "desc" }, { isVisible: "desc" }, { createdAt: "desc" }],
    include: {
      items: {
        include: {
          experience: { select: { id: true, title: true } },
        },
      },
      _count: { select: { purchases: true } },
    },
  });
  return NextResponse.json({ packages });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
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
  if (!name) return NextResponse.json({ error: "Package name is required" }, { status: 400 });
  const priceCents = typeof body.priceCents === "number" ? Math.floor(body.priceCents) : NaN;
  if (!Number.isFinite(priceCents) || priceCents < 0) {
    return NextResponse.json({ error: "Valid priceCents is required" }, { status: 400 });
  }
  const validityDays = typeof body.validityDays === "number" ? Math.floor(body.validityDays) : NaN;
  if (!Number.isFinite(validityDays) || validityDays < 1 || validityDays > 3650) {
    return NextResponse.json({ error: "validityDays must be between 1 and 3650" }, { status: 400 });
  }

  const experienceIds = normalizeExperienceIds(body.experienceIds);
  if (experienceIds.length === 0) {
    return NextResponse.json({ error: "Choose at least one class for this package" }, { status: 400 });
  }
  const experienceQuantityById = new Map<string, number>();
  const quantityMap = typeof body.experienceCredits === "object" && body.experienceCredits ? body.experienceCredits : {};
  for (const id of experienceIds) {
    const raw = (quantityMap as Record<string, unknown>)[id];
    const quantity = typeof raw === "number" && Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
    experienceQuantityById.set(id, quantity);
  }
  const matchedExperiences = await prisma.experience.findMany({
    where: { id: { in: experienceIds }, studioId },
    select: { id: true },
  });
  if (matchedExperiences.length !== experienceIds.length) {
    return NextResponse.json({ error: "One or more classes are invalid for this studio" }, { status: 400 });
  }

  const generalItemLimitRaw =
    typeof body.generalItemLimit === "number" && Number.isFinite(body.generalItemLimit)
      ? Math.max(1, Math.floor(body.generalItemLimit))
      : null;
  const totalCredits = generalItemLimitRaw ?? experienceIds.reduce((sum, id) => sum + (experienceQuantityById.get(id) ?? 1), 0);

  const created = await prisma.classPackage.create({
    data: {
      studioId,
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      imageUrl: typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null,
      priceCents,
      currency: "EUR",
      validityDays,
      generalItemLimit: generalItemLimitRaw,
      maxSetsForSale:
        typeof body.maxSetsForSale === "number" && Number.isFinite(body.maxSetsForSale)
          ? Math.max(1, Math.floor(body.maxSetsForSale))
          : null,
      isActive: body.isActive !== false,
      isVisible: body.isVisible !== false,
      autoRefundOnCancel: body.autoRefundOnCancel === true,
      items: {
        create: experienceIds.map((experienceId) => ({
          experienceId,
          quantity: experienceQuantityById.get(experienceId) ?? 1,
        })),
      },
    },
    include: {
      items: {
        include: { experience: { select: { id: true, title: true } } },
      },
      _count: { select: { purchases: true } },
    },
  });

  return NextResponse.json(
    {
      package: {
        ...created,
        totalCredits,
      },
    },
    { status: 201 },
  );
}
