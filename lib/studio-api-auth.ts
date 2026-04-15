import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export type StudioAuthResult =
  | { ok: true; user: NonNullable<Awaited<ReturnType<typeof getSessionUser>>>; studioId: string }
  | { ok: false; status: 401 | 403 | 404; error: string };

/**
 * Shared auth guard for studio-scoped API routes.
 * Ensures the caller is authenticated AND is the owner of the given studio.
 */
export async function requireStudioOwner(studioId: string): Promise<StudioAuthResult> {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });

  if (!studio) {
    return { ok: false, status: 404, error: "Studio not found" };
  }

  if (studio.ownerUserId !== user.id && user.role !== "admin" && user.role !== "hyper_admin") {
    return { ok: false, status: 403, error: "Not authorized for this studio" };
  }

  return { ok: true, user, studioId };
}
