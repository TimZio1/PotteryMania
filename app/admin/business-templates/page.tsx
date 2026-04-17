import { redirect } from "next/navigation";
import AdminBusinessTemplatesClient from "@/components/admin/admin-business-templates-client";
import { requireAdminUser } from "@/lib/auth-session";
import { loadBusinessTemplateAdminOverview } from "@/lib/admin-business-templates-overview";
import { ui } from "@/lib/ui-styles";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Business templates",
  "/admin/business-templates",
  "Studio onboarding templates and defaults.",
);

export const dynamic = "force-dynamic";

export default async function AdminBusinessTemplatesPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const overview = await loadBusinessTemplateAdminOverview();

  return (
    <div>
      <p className={ui.overline}>Catalog</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Studio business templates</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Control visibility, list pricing, featured and platform-recommended badges, and the default template shown to new
        studios. Vendor gallery copy and themes are seeded; edit rows in the database or extend seed files for large copy
        changes.
      </p>
      <div className="mt-8">
        <AdminBusinessTemplatesClient overview={overview} />
      </div>
    </div>
  );
}
