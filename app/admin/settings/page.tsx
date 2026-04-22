import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { getRankingScoreWeights } from "@/lib/ranking-weights-config";
import { RankingWeightsForm } from "@/components/admin/ranking-weights-form";
import { CommissionForm } from "./commission-form";

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

  const [configSample, rankingWeights] = await Promise.all([
    prisma.adminConfig.findMany({
      orderBy: { configKey: "asc" },
      take: 40,
      select: { configKey: true },
    }),
    getRankingScoreWeights(),
  ]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Settings</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Platform settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Commission changes are written to the audit log. Heavier billing tools live in finance.
      </p>

      <div className="mt-8">
        <CommissionForm />
      </div>

      <div className="mt-10">
        <RankingWeightsForm initial={rankingWeights} />
      </div>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">More admin tools</h2>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Less frequent screens, grouped here to keep the sidebar short.
        </p>
        <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <li>
            <Link href="/admin/platform-features" className="font-medium text-amber-900 hover:underline">
              Platform add-ons
            </Link>
          </li>
          <li>
            <Link href="/admin/feature-bundles" className="font-medium text-amber-900 hover:underline">
              Feature bundles
            </Link>
          </li>
          <li>
            <Link href="/admin/business-templates" className="font-medium text-amber-900 hover:underline">
              Business templates
            </Link>
          </li>
          <li>
            <Link href="/admin/storefront-domains" className="font-medium text-amber-900 hover:underline">
              Storefront domains
            </Link>
          </li>
          <li>
            <Link href="/admin/categories" className="font-medium text-amber-900 hover:underline">
              Ceramic categories
            </Link>
          </li>
          <li>
            <Link href="/admin/marketplace" className="font-medium text-amber-900 hover:underline">
              Discovery controls
            </Link>
          </li>
          <li>
            <Link href="/admin/marketplace-ranking" className="font-medium text-amber-900 hover:underline">
              Ranking weights
            </Link>
          </li>
          <li>
            <Link href="/admin/experiments" className="font-medium text-amber-900 hover:underline">
              Experiments
            </Link>
          </li>
          <li>
            <Link href="/admin/webhook-events" className="font-medium text-amber-900 hover:underline">
              Webhook events
            </Link>
          </li>
          <li>
            <Link href="/admin/ai-insights" className="font-medium text-amber-900 hover:underline">
              AI insights
            </Link>
          </li>
          <li>
            <Link href="/admin/blog" className="font-medium text-amber-900 hover:underline">
              Blog
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-[var(--foreground)]">Config keys (read-only)</h2>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {configSample.length} keys shown. Edits go through the DB and should be audited.
        </p>
        <ul className="mt-4 max-h-48 overflow-auto font-mono text-xs text-[var(--muted)]">
          {configSample.map((c) => (
            <li key={c.configKey}>{c.configKey}</li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm">
        <Link href="/admin/finance" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Open finance →
        </Link>
      </p>
    </div>
  );
}
