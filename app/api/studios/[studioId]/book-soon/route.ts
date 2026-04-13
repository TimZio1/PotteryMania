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
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rules = await prisma.bookSoonRule.findMany({
    where: { studioId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ rules });
}

export async function POST(req: Request, ctx: Ctx) {
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const daysAfterVisit = typeof body.daysAfterVisit === "number" ? Math.floor(body.daysAfterVisit) : NaN;
  if (!Number.isFinite(daysAfterVisit) || daysAfterVisit < 1 || daysAfterVisit > 365) {
    return NextResponse.json({ error: "daysAfterVisit must be 1-365" }, { status: 400 });
  }
  const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject.trim() : "";
  const emailBody = typeof body.emailBody === "string" ? body.emailBody.trim() : "";
  if (!emailSubject || !emailBody) {
    return NextResponse.json({ error: "emailSubject and emailBody are required" }, { status: 400 });
  }

  const experienceIds = normalizeExperienceIds(body.experienceIds);
  if (experienceIds.length > 0) {
    const count = await prisma.experience.count({ where: { studioId, id: { in: experienceIds } } });
    if (count !== experienceIds.length) {
      return NextResponse.json({ error: "One or more experienceIds are invalid for this studio" }, { status: 400 });
    }
  }

  const rule = await prisma.bookSoonRule.create({
    data: {
      studioId,
      name,
      daysAfterVisit,
      emailSubject,
      emailBody,
      experienceIds,
      isActive: body.isActive !== false,
    },
  });
  return NextResponse.json({ rule }, { status: 201 });
}
