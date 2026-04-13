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

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const existing = await prisma.experienceAddOn.findFirst({
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

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    data.name = name;
  }
  if (typeof body.description === "string" || body.description === null) {
    data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  }
  if (typeof body.imageUrl === "string" || body.imageUrl === null) {
    data.imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() || null : null;
  }
  if (typeof body.priceCents === "number") {
    const priceCents = Math.floor(body.priceCents);
    if (priceCents < 0) return NextResponse.json({ error: "priceCents must be 0 or greater" }, { status: 400 });
    data.priceCents = priceCents;
  }
  if (typeof body.currency === "string") {
    const currency = body.currency.trim().toUpperCase();
    if (currency !== "EUR") {
      return NextResponse.json({ error: "Only EUR add-ons are currently supported" }, { status: 400 });
    }
    data.currency = currency;
  }
  if (typeof body.durationMinutesExtra === "number" && Number.isFinite(body.durationMinutesExtra)) {
    data.durationMinutesExtra = Math.max(0, Math.min(720, Math.floor(body.durationMinutesExtra)));
  }
  if (body.isActive === true || body.isActive === false) data.isActive = body.isActive;
  if (body.isSelectedByDefault === true || body.isSelectedByDefault === false) {
    data.isSelectedByDefault = body.isSelectedByDefault;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.max(0, Math.floor(body.sortOrder));
  }
  if (typeof body.maxPerBooking === "number" && Number.isFinite(body.maxPerBooking)) {
    data.maxPerBooking = Math.max(1, Math.min(99, Math.floor(body.maxPerBooking)));
  }

  const addOn = await prisma.experienceAddOn.update({
    where: { id },
    data,
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
      ...addOn,
      experienceIds: addOn.experiences.map((link) => link.experienceId),
      linkedExperiences: addOn.experiences.map((link) => ({
        id: link.experienceId,
        title: link.experience.title,
      })),
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.experienceAddOn.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.experienceAddOn.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
