import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { normalizeStudentEmail, parseTagsInput } from "@/lib/studio-student-crm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string; contactId: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, contactId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.studioContact.findFirst({
    where: { id: contactId, studioId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    displayName?: string;
    phone?: string | null;
    notes?: string | null;
    tags?: string | string[];
    email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextEmail =
    typeof body.email === "string" && body.email.trim() ? normalizeStudentEmail(body.email) : existing.emailNormalized;

  if (nextEmail !== existing.emailNormalized) {
    const clash = await prisma.studioContact.findFirst({
      where: { studioId, emailNormalized: nextEmail, NOT: { id: contactId } },
    });
    if (clash) {
      return NextResponse.json({ error: "Another contact already uses this email" }, { status: 409 });
    }
  }

  const displayName =
    typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim()
      : existing.displayName;

  const phone =
    body.phone === null ? null : typeof body.phone === "string" ? body.phone.trim() || null : existing.phone;

  const notes =
    body.notes === null ? null : typeof body.notes === "string" ? body.notes.trim() || null : existing.notes;

  const tags = Array.isArray(body.tags)
    ? body.tags.map(String).filter(Boolean).slice(0, 20)
    : body.tags !== undefined
      ? parseTagsInput(String(body.tags))
      : existing.tags;

  const updated = await prisma.studioContact.update({
    where: { id: contactId },
    data: {
      emailNormalized: nextEmail,
      displayName,
      phone,
      notes,
      tags,
    },
  });

  return NextResponse.json({ contact: updated });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, contactId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = await prisma.studioContact.findFirst({
    where: { id: contactId, studioId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studioContact.delete({ where: { id: contactId } });
  return NextResponse.json({ ok: true });
}
