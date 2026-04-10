import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  void prisma;
  return NextResponse.json({ count: 0, closed: true }, {
    status: 410,
    headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120" },
  });
}
