import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const where = status ? { status: status as "pending_review" } : {};
  const studios = await prisma.studio.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { owner: { select: { id: true, email: true } } },
  });
  return NextResponse.json({ studios });
}