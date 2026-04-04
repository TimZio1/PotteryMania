import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  const role = (session?.user as { role?: UserRole })?.role;
  if (!id || !email || !role) return null;
  return { id, email, role };
}

export function isAdminRole(role: UserRole): boolean {
  return role === "hyper_admin" || role === "admin";
}

/**
 * Use for /admin and admin APIs: role is read from the database so promoting a user
 * to admin takes effect without waiting for JWT refresh (session cookie still required).
 */
export async function requireAdminUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const row = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, role: true },
  });
  if (!row || !isAdminRole(row.role)) return null;
  return { id: row.id, email: row.email, role: row.role };
}
