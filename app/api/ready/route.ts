import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getErrorMessage, isDatabaseConnectionPoolExhaustion } from "@/lib/db-connectivity";

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
    const message = getErrorMessage(error);

    if (isDatabaseConnectionPoolExhaustion(error)) {
      return NextResponse.json(
        {
          ok: true,
          service: "potterymania",
          db: "transient_connection_pool_exhausted",
          error: message,
        },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        service: "potterymania",
        db: "error",
        error: message,
      },
      { status: 503 },
    );
  }
}
