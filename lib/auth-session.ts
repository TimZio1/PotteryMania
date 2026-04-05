import { cache } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
};

/**
 * Current user from the database (not the JWT alone), so role changes take effect immediately.
 * Wrapped in React `cache()` so multiple calls in one request share one query.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  try {
    const row = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, role: true, suspendedAt: true },
    });
    if (!row || row.suspendedAt) return null;
    return { id: row.id, email: row.email, role: row.role };
  } catch (e) {
    console.error("[getSessionUser]", e);
    return null;
  }
});

export function isAdminRole(role: UserRole): boolean {
  return role === "hyper_admin" || role === "admin";
}

/**
 * Hyperadmin /admin and admin APIs: DB-backed role check (same as getSessionUser + admin filter).
 */
export async function requireAdminUser(): Promise<SessionUser | null> {
  const session = await auth();
  if ((session?.user as { impersonatorId?: string })?.impersonatorId) {
    return null;
  }
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) return null;
  return user;
}
