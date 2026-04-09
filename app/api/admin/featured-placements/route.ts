import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function POST() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(
    { error: "Featured placements are disabled by fairness policy (no paid/sponsored visibility)." },
    { status: 403 },
  );
}
