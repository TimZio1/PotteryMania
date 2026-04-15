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

  const rules = await prisma.bookSoonRule.findMany({
    where: { studioId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json({ rules });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
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
