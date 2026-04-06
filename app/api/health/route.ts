import { NextResponse } from "next/server";

/** Lightweight liveness check for admin system health (P5-I). */
export async function GET() {
  return NextResponse.json({ ok: true, t: Date.now() });
}
