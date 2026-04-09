import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  let count = 0;
  try {
    count = await prisma.earlyAccessSignup.count();
  } catch {
    // Keep the public page usable when database connectivity is temporarily degraded.
    count = 0;
  }
  return NextResponse.json({ count }, {
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
