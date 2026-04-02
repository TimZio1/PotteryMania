import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { Prisma } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  if (studio.ownerUserId !== user.id && !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const blocks = await prisma.studioDateBlock.findMany({
    where: { studioId },
    orderBy: { blockDate: "asc" },
  });
  return NextResponse.json({ blocks });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  if (studio.ownerUserId !== user.id && !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: { date?: string; note?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dateStr = typeof body.date === "string" ? body.date.trim() : "";
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "date required in YYYY-MM-DD format" }, { status: 400 });
  }

  const blockDate = new Date(dateStr + "T00:00:00Z");

  const slotsOnDate = await prisma.bookingSlot.findMany({
    where: {
      experience: { studioId },
      slotDate: blockDate,
      status: "open",
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.studioDateBlock.create({
        data: {
          studioId,
          blockDate,
          note: body.note?.trim() || null,
          createdBy: user.id,
        },
      });

      if (slotsOnDate.length > 0) {
        await tx.bookingSlot.updateMany({
          where: {
            id: { in: slotsOnDate.map((s) => s.id) },
          },
          data: { status: "blocked" },
        });
      }
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "Date already blocked" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true, slotsBlocked: slotsOnDate.length });
}

export async function DELETE(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return NextResponse.json({ error: "Studio not found" }, { status: 404 });
  if (studio.ownerUserId !== user.id && !isAdminRole(user.role)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  let body: { date?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const dateStr = typeof body.date === "string" ? body.date.trim() : "";
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: "date required in YYYY-MM-DD format" }, { status: 400 });
  }

  const blockDate = new Date(dateStr + "T00:00:00Z");

  await prisma.$transaction(async (tx) => {
    await tx.studioDateBlock.deleteMany({
      where: { studioId, blockDate },
    });

    await tx.bookingSlot.updateMany({
      where: {
        experience: { studioId },
        slotDate: blockDate,
        status: "blocked",
      },
      data: { status: "open" },
    });
  });

  return NextResponse.json({ ok: true });
}