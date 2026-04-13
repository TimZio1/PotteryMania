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

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const [config, experiences] = await Promise.all([
    prisma.loyaltyConfig.findUnique({ where: { studioId } }),
    prisma.experience.findMany({
      where: { studioId, status: "active" },
      orderBy: { title: "asc" },
      select: { id: true, title: true, loyaltyPointsEarned: true },
    }),
  ]);

  return NextResponse.json({
    config: {
      isEnabled: config?.isEnabled ?? false,
    },
    experiences,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const isEnabled = body.isEnabled === true;
  const pointsByExperience =
    typeof body.pointsByExperience === "object" && body.pointsByExperience
      ? (body.pointsByExperience as Record<string, unknown>)
      : {};

  const experienceIds = Object.keys(pointsByExperience);
  if (experienceIds.length > 0) {
    const valid = await prisma.experience.count({ where: { studioId, id: { in: experienceIds } } });
    if (valid !== experienceIds.length) {
      return NextResponse.json({ error: "One or more experiences are invalid" }, { status: 400 });
    }
  }

  const config = await prisma.$transaction(async (tx) => {
    const upserted = await tx.loyaltyConfig.upsert({
      where: { studioId },
      create: { studioId, isEnabled },
      update: { isEnabled },
    });

    for (const experienceId of experienceIds) {
      const raw = pointsByExperience[experienceId];
      const points = typeof raw === "number" && Number.isFinite(raw) ? Math.max(0, Math.floor(raw)) : 0;
      await tx.experience.update({
        where: { id: experienceId },
        data: { loyaltyPointsEarned: points },
      });
    }
    return upserted;
  });

  return NextResponse.json({ config: { isEnabled: config.isEnabled } });
}
