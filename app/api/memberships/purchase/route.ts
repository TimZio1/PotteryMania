import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { assertRateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "memberships-purchase", 10, 60_000);
  if (!rate.allowed) return NextResponse.json({ error: "Too many purchase attempts" }, { status: 429 });

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const membershipId = typeof body.membershipId === "string" ? body.membershipId.trim() : "";
  if (!membershipId) return NextResponse.json({ error: "membershipId is required" }, { status: 400 });
  const membershipExists = await prisma.membership.findFirst({
    where: { id: membershipId, isActive: true, isVisible: true },
    select: { id: true },
  });
  if (!membershipExists) return NextResponse.json({ error: "Membership not found" }, { status: 404 });

  // Security hard-stop: membership activation must happen only after verified payment webhook settlement.
  return NextResponse.json(
    { error: "Membership checkout is temporarily unavailable while secure payment flow is finalized." },
    { status: 503 },
  );
}
