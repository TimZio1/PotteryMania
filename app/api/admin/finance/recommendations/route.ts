import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireFinanceAdmin } from "@/lib/finance/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  const g = await requireFinanceAdmin();
  if (!g.ok) return g.response;

  const recommendations = await prisma.financialRecommendation.findMany({
    where: { status: "suggested" },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ recommendations });
}
