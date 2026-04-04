import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

function escapeCsv(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const action = searchParams.get("action")?.trim();
  const entityType = searchParams.get("entityType")?.trim();
  const search = searchParams.get("q")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const format = searchParams.get("format");

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (entityType) where.entityType = entityType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (search) {
    where.OR = [
      { entityId: { contains: search, mode: "insensitive" } },
      { reason: { contains: search, mode: "insensitive" } },
      { actor: { is: { email: { contains: search, mode: "insensitive" } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  if (format === "csv") {
    const header = ["id", "createdAt", "actorEmail", "action", "entityType", "entityId", "reason", "beforeJson", "afterJson"];
    const lines = [
      header.join(","),
      ...rows.map((r) =>
        [
          r.id,
          r.createdAt.toISOString(),
          r.actor?.email ?? "",
          r.action,
          r.entityType,
          r.entityId ?? "",
          r.reason ?? "",
          r.beforeJson != null ? JSON.stringify(r.beforeJson) : "",
          r.afterJson != null ? JSON.stringify(r.afterJson) : "",
        ]
          .map((c) => escapeCsv(String(c)))
          .join(","),
      ),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="admin-audit-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((r) => ({
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      actorEmail: r.actor?.email ?? null,
      action: r.action,
      entityType: r.entityType,
      entityId: r.entityId,
      reason: r.reason,
      beforeJson: r.beforeJson,
      afterJson: r.afterJson,
    })),
  });
}
