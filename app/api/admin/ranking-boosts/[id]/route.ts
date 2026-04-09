import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function DELETE() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(
    { error: "Ranking boosts are disabled by fairness policy (ranking is not purchasable)." },
    { status: 403 },
  );
}
