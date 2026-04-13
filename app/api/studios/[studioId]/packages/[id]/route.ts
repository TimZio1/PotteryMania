import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

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

  const { studioId, id } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pkg = await prisma.classPackage.findFirst({
    where: { id, studioId },
    include: {
      items: {
        include: { experience: { select: { id: true, title: true } } },
      },
      purchases: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { id: true, email: true, customerProfile: { select: { fullName: true } } } },
        },
      },
    },
  });
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ package: pkg });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.classPackage.findFirst({
    where: { id, studioId },
    include: { items: { select: { id: true, experienceId: true } } },
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
    priceCents?: number;
    validityDays?: number;
    generalItemLimit?: number | null;
    maxSetsForSale?: number | null;
    isActive?: boolean;
    isVisible?: boolean;
    autoRefundOnCancel?: boolean;
  } = {};

  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Package name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if ("description" in body) data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  if ("imageUrl" in body) data.imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null;
  if ("priceCents" in body) {
    const priceCents = typeof body.priceCents === "number" ? Math.floor(body.priceCents) : NaN;
    if (!Number.isFinite(priceCents) || priceCents < 0) return NextResponse.json({ error: "Invalid priceCents" }, { status: 400 });
    data.priceCents = priceCents;
  }
  if ("validityDays" in body) {
    const validityDays = typeof body.validityDays === "number" ? Math.floor(body.validityDays) : NaN;
    if (!Number.isFinite(validityDays) || validityDays < 1 || validityDays > 3650) {
      return NextResponse.json({ error: "validityDays must be between 1 and 3650" }, { status: 400 });
    }
    data.validityDays = validityDays;
  }
  if ("generalItemLimit" in body) {
    data.generalItemLimit =
      typeof body.generalItemLimit === "number" && Number.isFinite(body.generalItemLimit)
        ? Math.max(1, Math.floor(body.generalItemLimit))
        : null;
  }
  if ("maxSetsForSale" in body) {
    data.maxSetsForSale =
      typeof body.maxSetsForSale === "number" && Number.isFinite(body.maxSetsForSale)
        ? Math.max(1, Math.floor(body.maxSetsForSale))
        : null;
  }
  if ("isActive" in body) data.isActive = body.isActive === true;
  if ("isVisible" in body) data.isVisible = body.isVisible === true;
  if ("autoRefundOnCancel" in body) data.autoRefundOnCancel = body.autoRefundOnCancel === true;

  const experienceIds = "experienceIds" in body ? normalizeExperienceIds(body.experienceIds) : null;
  const quantityMap = typeof body.experienceCredits === "object" && body.experienceCredits ? body.experienceCredits : {};
  if (experienceIds && experienceIds.length > 0) {
    const count = await prisma.experience.count({
      where: { id: { in: experienceIds }, studioId },
    });
    if (count !== experienceIds.length) {
      return NextResponse.json({ error: "One or more linked classes are invalid" }, { status: 400 });
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (experienceIds) {
      await tx.classPackageItem.deleteMany({ where: { packageId: id } });
      if (experienceIds.length > 0) {
        await tx.classPackageItem.createMany({
          data: experienceIds.map((experienceId) => {
            const raw = (quantityMap as Record<string, unknown>)[experienceId];
            const quantity = typeof raw === "number" && Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
            return {
              packageId: id,
              experienceId,
              quantity,
            };
          }),
        });
      }
    }
    return tx.classPackage.update({
      where: { id },
      data,
      include: {
        items: {
          include: { experience: { select: { id: true, title: true } } },
        },
        _count: { select: { purchases: true } },
      },
    });
  });

  return NextResponse.json({ package: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.classPackage.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.classPackage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
