import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { metaAdminPage } from "@/lib/seo-routes";
import { syncLockedCeramicCategories } from "@/lib/ceramic-categories";
import CategoriesAdminClient from "@/components/admin/categories-admin-client";

export const metadata: Metadata = metaAdminPage(
  "Ceramic categories",
  "/admin/categories",
  "Manage category copy and imagery for ceramic discovery.",
);

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  await syncLockedCeramicCategories(prisma);
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Marketplace</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Ceramic categories</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Locked 10-category system for discovery. Edit hero image and SEO descriptions here.
      </p>
      <CategoriesAdminClient initial={categories} />
    </div>
  );
}
