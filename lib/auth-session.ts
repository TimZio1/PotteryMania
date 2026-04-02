import { auth } from "@/auth";
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
