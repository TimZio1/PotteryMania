import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import { isApparelAdminMode } from "@/lib/launch-mode";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Settings",
  "/admin/settings",
  "Platform settings and related admin tools.",
);

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const apparelAdmin = isApparelAdminMode();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
        {apparelAdmin ? "Apparel settings" : "Settings"}
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        {apparelAdmin
          ? "Wear-specific controls moved to a dedicated hub so category rules, margins, and the shelf calculator stay in one place."
          : "Operator preferences and platform rules."}
      </p>

      {apparelAdmin ? (
        <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-[var(--foreground)]">Wear pricing &amp; markup</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Edit Spreadconnect-type markups, per-product overrides, default checkout margin, and affiliate min/max — with a live
            calculator.
          </p>
          <Link
            href="/admin/wear-pricing"
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-[var(--heat)] px-5 text-sm font-semibold text-[var(--ink)] transition hover:opacity-95"
          >
            Open pricing hub
          </Link>
        </div>
      ) : null}

      <p className="mt-8 text-sm text-[var(--muted)]">
        Need affiliate commission rules?{" "}
        <Link href="/admin/affiliates" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Open affiliates
        </Link>
        .
      </p>
    </div>
  );
}
