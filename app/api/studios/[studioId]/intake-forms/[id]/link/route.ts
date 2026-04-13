import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))];
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const form = await prisma.intakeForm.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!form) return NextResponse.json({ error: "Question not found" }, { status: 404 });

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
    await tx.intakeFormExperienceLink.deleteMany({ where: { formId: id } });
    if (experienceIds.length > 0) {
      await tx.intakeFormExperienceLink.createMany({
        data: experienceIds.map((experienceId) => ({
          formId: id,
          experienceId,
        })),
      });
    }
  });

  const updated = await prisma.intakeForm.findUnique({
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
    form: {
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
