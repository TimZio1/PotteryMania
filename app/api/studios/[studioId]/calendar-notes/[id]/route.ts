import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const existing = await prisma.calendarNote.findFirst({ where: { id, studioId }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await prisma.calendarNote.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
