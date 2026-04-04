import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";

export async function requireFinanceAdmin(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof requireAdminUser>>> }
  | { ok: false; response: NextResponse }
> {
  const user = await requireAdminUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, user };
}
