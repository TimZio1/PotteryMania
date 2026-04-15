import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))];
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const addOn = await prisma.experienceAddOn.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!addOn) return NextResponse.json({ error: "Add-on not found" }, { status: 404 });

  let body: { experienceIds?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
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

  await prisma.$transaction(async (tx) => {
    await tx.experienceAddOnLink.deleteMany({ where: { addOnId: id } });
    if (experienceIds.length > 0) {
      await tx.experienceAddOnLink.createMany({
        data: experienceIds.map((experienceId) => ({
          addOnId: id,
          experienceId,
        })),
      });
    }
  });

  const updated = await prisma.experienceAddOn.findUnique({
    where: { id },
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
    addOn: {
      ...updated,
      experienceIds: updated?.experiences.map((link) => link.experienceId) ?? [],
      linkedExperiences:
        updated?.experiences.map((link) => ({
          id: link.experienceId,
          title: link.experience.title,
        })) ?? [],
    },
  });
}
