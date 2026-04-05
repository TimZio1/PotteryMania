import { NextResponse } from "next/server";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeAdminTags } from "@/lib/admin-user-tags";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

const ROLES: UserRole[] = ["customer", "vendor", "admin", "hyper_admin"];

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  const row = await prisma.user.findUnique({
    where: { id },
    include: {
      customerProfile: true,
      acquisitionAttributions: true,
      ownedStudios: { select: { id: true, displayName: true, status: true } },
      adminNotesReceived: {
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { author: { select: { email: true } } },
      },
      _count: {
        select: { orders: true, bookingsAsCustomer: true, ownedStudios: true },
      },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const orderAgg = await prisma.order.aggregate({
    where: { customerUserId: id },
    _sum: { totalCents: true },
    _count: { id: true },
  });

  return NextResponse.json({
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      createdAt: row.createdAt.toISOString(),
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      suspendedAt: row.suspendedAt?.toISOString() ?? null,
      suspendedReason: row.suspendedReason,
      emailVerifiedAt: row.emailVerifiedAt?.toISOString() ?? null,
      adminTags: row.adminTags,
      customerProfile: row.customerProfile,
      acquisition: row.acquisitionAttributions,
      studios: row.ownedStudios,
      notes: row.adminNotesReceived.map((n) => ({
        id: n.id,
        content: n.content,
        createdAt: n.createdAt.toISOString(),
        authorEmail: n.author?.email ?? null,
      })),
      counts: row._count,
      orderTotals: {
        paid: orderAgg._count.id,
        totalCents: orderAgg._sum.totalCents ?? 0,
      },
    },
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const admin = await requireAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await ctx.params;
  if (id === admin.id) {
    return NextResponse.json({ error: "You cannot modify your own account here." }, { status: 400 });
  }

  let body: {
    role?: string;
    suspended?: boolean;
    suspendedReason?: string | null;
    adminTags?: unknown;
    reason?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (!reason.length) {
    return NextResponse.json({ error: "reason is required" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id },
    select: {
      role: true,
      suspendedAt: true,
      suspendedReason: true,
      adminTags: true,
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data: Prisma.UserUpdateInput = {};

  if (body.role !== undefined) {
    const nextRole = body.role as UserRole;
    if (!ROLES.includes(nextRole)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    if ((nextRole === "admin" || nextRole === "hyper_admin") && admin.role !== "hyper_admin") {
      return NextResponse.json({ error: "Only hyper_admin can assign admin roles" }, { status: 403 });
    }
    if (nextRole === "hyper_admin" && admin.role !== "hyper_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (existing.role === "hyper_admin" && nextRole !== "hyper_admin") {
      const hyperCount = await prisma.user.count({ where: { role: "hyper_admin" } });
      if (hyperCount <= 1) {
        return NextResponse.json({ error: "Cannot demote the last hyper_admin" }, { status: 400 });
      }
    }
    if (nextRole !== existing.role) {
      data.role = nextRole;
    }
  }

  if (body.suspended !== undefined) {
    const isSuspended = Boolean(existing.suspendedAt);
    if (body.suspended !== isSuspended) {
      if (body.suspended) {
        data.suspendedAt = new Date();
        data.suspendedReason = body.suspendedReason?.trim() || "Suspended by admin";
      } else {
        data.suspendedAt = null;
        data.suspendedReason = null;
      }
    }
  }

  if (body.adminTags !== undefined) {
    const nextTags = normalizeAdminTags(body.adminTags);
    const prevSorted = [...existing.adminTags].sort();
    if (JSON.stringify(nextTags) !== JSON.stringify(prevSorted)) {
      data.adminTags = { set: nextTags };
    }
  }

  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const before = {
    role: existing.role,
    suspendedAt: existing.suspendedAt?.toISOString() ?? null,
    suspendedReason: existing.suspendedReason,
    adminTags: [...existing.adminTags].sort(),
  };

  const updated = await prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      role: true,
      suspendedAt: true,
      suspendedReason: true,
      adminTags: true,
    },
  });

  await logAdminAction({
    actorUserId: admin.id,
    action: "user.update",
    entityType: "user",
    entityId: id,
    before,
    after: {
      role: updated.role,
      suspendedAt: updated.suspendedAt?.toISOString() ?? null,
      suspendedReason: updated.suspendedReason,
      adminTags: [...updated.adminTags].sort(),
    },
    reason,
  });

  return NextResponse.json({ user: updated });
}
