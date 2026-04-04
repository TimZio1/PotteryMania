import { NextResponse } from "next/server";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

const ROLES: UserRole[] = ["customer", "vendor", "admin", "hyper_admin"];

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const q = searchParams.get("q")?.trim() ?? "";
  const roleParam = searchParams.get("role")?.trim() ?? "";
  const role = ROLES.includes(roleParam as UserRole) ? (roleParam as UserRole) : undefined;

  const where: Prisma.UserWhereInput = {};
  if (q) {
    where.email = { contains: q, mode: "insensitive" };
  }
  if (role) where.role = role;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        suspendedAt: true,
        suspendedReason: true,
        _count: { select: { ownedStudios: true, orders: true, bookingsAsCustomer: true } },
      },
    }),
  ]);

  return NextResponse.json({
    page,
    pageSize: PAGE_SIZE,
    total,
    rows: rows.map((r) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      createdAt: r.createdAt.toISOString(),
      lastLoginAt: r.lastLoginAt?.toISOString() ?? null,
      suspendedAt: r.suspendedAt?.toISOString() ?? null,
      suspendedReason: r.suspendedReason,
      studios: r._count.ownedStudios,
      orders: r._count.orders,
      bookings: r._count.bookingsAsCustomer,
    })),
  });
}
