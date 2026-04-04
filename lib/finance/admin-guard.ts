import { NextResponse } from "next/server";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";

export async function requireFinanceAdmin(): Promise<
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>> }
  | { ok: false; response: NextResponse }
> {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
    return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true, user };
}
