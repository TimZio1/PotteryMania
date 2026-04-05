import { NextResponse } from "next/server";
import type { Prisma, StudioStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

const STUDIO_STATUSES: StudioStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
];

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");
  const q = searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));
  const skip = (page - 1) * limit;

  const and: Prisma.StudioWhereInput[] = [];

  if (statusParam && statusParam !== "all") {
    if (!STUDIO_STATUSES.includes(statusParam as StudioStatus)) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }
    and.push({ status: statusParam as StudioStatus });
  }

  if (q.length > 0) {
    and.push({
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { legalBusinessName: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  const where: Prisma.StudioWhereInput = and.length ? { AND: and } : {};

  const [total, studios] = await Promise.all([
    prisma.studio.count({ where }),
    prisma.studio.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: limit,
      include: {
        owner: { select: { id: true, email: true } },
        stripeAccount: { select: { chargesEnabled: true, payoutsEnabled: true } },
        _count: { select: { products: true, experiences: true, bookings: true } },
      },
    }),
  ]);

  return NextResponse.json({
    studios,
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  });
}
