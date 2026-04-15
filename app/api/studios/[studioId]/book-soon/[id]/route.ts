import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))];
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.bookSoonRule.findFirst({
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
    daysAfterVisit?: number;
    emailSubject?: string;
    emailBody?: string;
    experienceIds?: string[];
    isActive?: boolean;
  } = {};

  if ("name" in body) {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if ("daysAfterVisit" in body) {
    const daysAfterVisit = typeof body.daysAfterVisit === "number" ? Math.floor(body.daysAfterVisit) : NaN;
    if (!Number.isFinite(daysAfterVisit) || daysAfterVisit < 1 || daysAfterVisit > 365) {
      return NextResponse.json({ error: "daysAfterVisit must be 1-365" }, { status: 400 });
    }
    data.daysAfterVisit = daysAfterVisit;
  }
  if ("emailSubject" in body) {
    const emailSubject = typeof body.emailSubject === "string" ? body.emailSubject.trim() : "";
    if (!emailSubject) return NextResponse.json({ error: "emailSubject cannot be empty" }, { status: 400 });
    data.emailSubject = emailSubject;
  }
  if ("emailBody" in body) {
    const emailBody = typeof body.emailBody === "string" ? body.emailBody.trim() : "";
    if (!emailBody) return NextResponse.json({ error: "emailBody cannot be empty" }, { status: 400 });
    data.emailBody = emailBody;
  }
  if ("isActive" in body) {
    data.isActive = body.isActive === true;
  }
  if ("experienceIds" in body) {
    const experienceIds = normalizeExperienceIds(body.experienceIds);
    if (experienceIds.length > 0) {
      const count = await prisma.experience.count({ where: { studioId, id: { in: experienceIds } } });
      if (count !== experienceIds.length) {
        return NextResponse.json({ error: "One or more experienceIds are invalid for this studio" }, { status: 400 });
      }
    }
    data.experienceIds = experienceIds;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const rule = await prisma.bookSoonRule.update({
    where: { id },
    data,
  });
  return NextResponse.json({ rule });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.bookSoonRule.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.bookSoonRule.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
