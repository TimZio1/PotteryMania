import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildProductWhere } from "@/lib/products";
import { canBrowseDuringPreregistration } from "@/lib/preregistration";
import { studioCanOperateWhere } from "@/lib/studio-operating-gates";

function isEndUserBrowse(role: string | undefined): boolean {
  return !canBrowseDuringPreregistration(role);
}

/** Guests and customers: send home when there is nothing to shop or book (vendors/admins may still browse). */
export async function redirectEndUserIfNoMarketplaceListings(role: string | undefined): Promise<void> {
  if (!isEndUserBrowse(role)) return;
  let n = 0;
  try {
    n = await prisma.product.count({ where: buildProductWhere({}) });
  } catch {
    return;
  }
  if (n === 0) redirect("/");
}

export async function redirectEndUserIfNoPublicClasses(role: string | undefined): Promise<void> {
  if (!isEndUserBrowse(role)) return;
  let n = 0;
  try {
    n = await prisma.experience.count({
      where: {
        status: "active",
        visibility: "public",
        studio: studioCanOperateWhere(),
      },
    });
  } catch {
    return;
  }
  if (n === 0) redirect("/");
}

export async function redirectEndUserIfNoApprovedStudios(role: string | undefined): Promise<void> {
  // Studio directory stays private during registration phase:
  // guests/customers are always redirected away.
  if (isEndUserBrowse(role)) redirect("/");
}

export function redirectEndUserIfStudioHasNoPublicOfferings(
  role: string | undefined,
  experienceCount: number,
  productCount: number,
  allowEmptyStudioProfile = false,
): void {
  // Keep individual studio pages private for end users as well.
  if (isEndUserBrowse(role)) redirect("/");
  if (allowEmptyStudioProfile) return;
  if (experienceCount === 0 && productCount === 0) redirect("/");
}
