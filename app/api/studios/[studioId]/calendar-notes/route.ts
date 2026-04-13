import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function canManageStudio(studioId: string) {
  const user = await getSessionUser();
  if (!user) return false;
  const studio = await prisma.studio.findFirst({ where: { id: studioId, ownerUserId: user.id }, select: { id: true } });
  return Boolean(studio);
}

export async function GET(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const where: {
    studioId: string;
    date?: { gte?: Date; lte?: Date };
  } = { studioId };
  if (from || to) {
    where.date = {};
    if (from) where.date.gte = new Date(from);
    if (to) where.date.lte = new Date(to);
  }
  const items = await prisma.calendarNote.findMany({ where, orderBy: [{ date: "asc" }, { createdAt: "asc" }] });
  return NextResponse.json({ items });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { date?: string; startTime?: string; endTime?: string; note?: string; color?: string; isAllDay?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const date = typeof body.date === "string" ? new Date(body.date) : null;
  if (!note || !date || Number.isNaN(date.getTime())) return NextResponse.json({ error: "date and note required" }, { status: 400 });

  const item = await prisma.calendarNote.create({
    data: {
      studioId,
      date,
      startTime: typeof body.startTime === "string" && body.startTime.trim() ? body.startTime.trim() : null,
      endTime: typeof body.endTime === "string" && body.endTime.trim() ? body.endTime.trim() : null,
      note,
      color: typeof body.color === "string" && body.color.trim() ? body.color.trim() : "#FEF3C7",
      isAllDay: body.isAllDay === true,
    },
  });
  return NextResponse.json({ item }, { status: 201 });
}
