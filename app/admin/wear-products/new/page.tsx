import { redirect } from "next/navigation";
import { requireHyperAdminUser } from "@/lib/auth-session";
import WearProductEditorClient from "@/components/admin/wear-product-editor-client";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "New wear product",
  "/admin/wear-products/new",
  "Create a wear product listing.",
);

export const dynamic = "force-dynamic";

export default async function AdminWearProductNewPage() {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Commerce · Wear</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">New wear product</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        After creating, add variants (sizes/colors) from the edit screen if the piece has options.
      </p>
      <WearProductEditorClient productId={null} />
    </div>
  );
}
