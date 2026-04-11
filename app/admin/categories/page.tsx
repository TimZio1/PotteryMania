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
  "Manage category copy and imagery for studio-owned shop pages.",
);

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  let unavailable = false;
  let categories: Awaited<ReturnType<typeof prisma.productCategory.findMany>> = [];
  try {
    await syncLockedCeramicCategories(prisma);
    categories = await prisma.productCategory.findMany({
      orderBy: { name: "asc" },
    });
  } catch {
    unavailable = true;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Shop taxonomy</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Ceramic categories</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Locked 10-category system for studio-owned shop pages. Edit hero image and SEO descriptions here.
      </p>
      {unavailable ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Category data is temporarily unavailable while schema updates finish deploying.
        </div>
      ) : (
        <CategoriesAdminClient initial={categories} />
      )}
    </div>
  );
}
