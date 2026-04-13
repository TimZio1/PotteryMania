import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function canManageStudio(studioId: string) {
  const user = await getSessionUser();
  if (!user) return false;
  const studio = await prisma.studio.findFirst({ where: { id: studioId, ownerUserId: user.id }, select: { id: true } });
  return Boolean(studio);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { date?: string; startTime?: string | null; endTime?: string | null; note?: string; color?: string; isAllDay?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const data: {
    date?: Date;
    startTime?: string | null;
    endTime?: string | null;
    note?: string;
    color?: string;
    isAllDay?: boolean;
  } = {};
  if (typeof body.date === "string") {
    const date = new Date(body.date);
    if (!Number.isNaN(date.getTime())) data.date = date;
  }
  if (typeof body.startTime === "string") data.startTime = body.startTime.trim() || null;
  if (body.startTime === null) data.startTime = null;
  if (typeof body.endTime === "string") data.endTime = body.endTime.trim() || null;
  if (body.endTime === null) data.endTime = null;
  if (typeof body.note === "string" && body.note.trim()) data.note = body.note.trim();
  if (typeof body.color === "string" && body.color.trim()) data.color = body.color.trim();
  if (typeof body.isAllDay === "boolean") data.isAllDay = body.isAllDay;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  const existing = await prisma.calendarNote.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const item = await prisma.calendarNote.update({ where: { id }, data });
  return NextResponse.json({ item });
}

export async function DELETE(_: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  if (!(await canManageStudio(studioId))) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const existing = await prisma.calendarNote.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.calendarNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
