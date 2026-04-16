import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Deploy and load balancer readiness.
 * Verifies the app can answer and reach the primary database.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: "potterymania", db: "ok" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        service: "potterymania",
        db: "error",
        error: error instanceof Error ? error.message : "unknown",
      },
      { status: 503 },
    );
  }
}
