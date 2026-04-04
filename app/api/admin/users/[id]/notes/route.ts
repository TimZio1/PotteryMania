import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id: targetUserId } = await ctx.params;

  let body: { content?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content.length) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";

  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
  if (!target) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const note = await prisma.adminNote.create({
    data: {
      authorUserId: admin.id,
      targetUserId,
      content,
    },
  });

  await logAdminAction({
    actorUserId: admin.id,
    action: "admin_note.create",
    entityType: "user",
    entityId: targetUserId,
    before: null,
    after: { noteId: note.id, contentPreview: content.slice(0, 280) },
    reason: reason || null,
  });

  return NextResponse.json({ note: { id: note.id, createdAt: note.createdAt.toISOString() } });
}
