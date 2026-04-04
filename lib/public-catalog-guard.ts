import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildProductWhere } from "@/lib/products";
import { canBrowseDuringPreregistration } from "@/lib/preregistration";

function isEndUserBrowse(role: string | undefined): boolean {
  return !canBrowseDuringPreregistration(role);
}

/** Guests and customers: send home when there is nothing to shop or book (vendors/admins may still browse). */
export async function redirectEndUserIfNoMarketplaceListings(role: string | undefined): Promise<void> {
  if (!isEndUserBrowse(role)) return;
  const n = await prisma.product.count({ where: buildProductWhere({}) });
  if (n === 0) redirect("/");
}

export async function redirectEndUserIfNoPublicClasses(role: string | undefined): Promise<void> {
  if (!isEndUserBrowse(role)) return;
  const n = await prisma.experience.count({
    where: {
      status: "active",
      visibility: "public",
      studio: { status: "approved" },
    },
  });
  if (n === 0) redirect("/");
}

export async function redirectEndUserIfNoApprovedStudios(role: string | undefined): Promise<void> {
  if (!isEndUserBrowse(role)) return;
  const n = await prisma.studio.count({ where: { status: "approved" } });
  if (n === 0) redirect("/");
}

export function redirectEndUserIfStudioHasNoPublicOfferings(
  role: string | undefined,
  experienceCount: number,
  productCount: number,
): void {
  if (!isEndUserBrowse(role)) return;
  if (experienceCount === 0 && productCount === 0) redirect("/");
}
