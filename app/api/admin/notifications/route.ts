import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [items, unread] = await Promise.all([
    prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.adminNotification.count({ where: { readAt: null } }),
  ]);

  return NextResponse.json({
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      level: n.level,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { title?: string; body?: string; level?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("admin_notifications_post_invalid_json", e, undefined, req);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.body === "string" ? body.body.trim() : null;
  const level = typeof body.level === "string" ? body.level.trim() : "info";
  if (title.length < 2) return NextResponse.json({ error: "title required" }, { status: 400 });

  const row = await prisma.adminNotification.create({
    data: { title, body: text, level: level || "info" },
  });

  return NextResponse.json({ id: row.id });
}
