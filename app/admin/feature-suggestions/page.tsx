import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireAdminUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { metaAdminPage } from "@/lib/seo-routes";
import {
  FEATURE_SUGGESTION_STATUSES,
  FEATURE_SUGGESTION_STATUS_LABEL,
  type FeatureSuggestionStatus,
} from "@/lib/feature-suggestions";
import { FeatureSuggestionRowActions } from "./feature-suggestion-row-actions";

export const metadata: Metadata = metaAdminPage(
  "Feature suggestions",
  "/admin/feature-suggestions",
  "Ideas submitted from the public feature form.",
);

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ status?: string }>;
};

const STATUS_LABEL = FEATURE_SUGGESTION_STATUS_LABEL;

function parseStatus(raw: string | undefined): FeatureSuggestionStatus | null {
  if (!raw) return null;
  return (FEATURE_SUGGESTION_STATUSES as readonly string[]).includes(raw)
    ? (raw as FeatureSuggestionStatus)
    : null;
}

export default async function AdminFeatureSuggestionsPage({ searchParams }: Props) {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const sp = (await searchParams) ?? {};
  const activeStatus = parseStatus(sp.status);

  const [rows, countsRaw] = await Promise.all([
    prisma.featureSuggestion.findMany({
      where: activeStatus ? { status: activeStatus } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.featureSuggestion.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const counts = new Map<string, number>();
  let total = 0;
  for (const c of countsRaw) {
    counts.set(c.status, c._count._all);
    total += c._count._all;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Product</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Feature suggestions</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Ideas people sent through the public form at <code className="rounded bg-stone-100 px-1">/suggest-feature</code>. Mark them as triaged, planned, shipped, or declined.
      </p>

      <p className="mt-4 text-sm">
        <Link href="/admin" className="font-medium text-amber-900 underline">
          ← Home
        </Link>
      </p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Filter by status">
        <StatusChip href="/admin/feature-suggestions" label={`All (${total})`} active={activeStatus === null} />
        {FEATURE_SUGGESTION_STATUSES.map((status) => (
          <StatusChip
            key={status}
            href={`/admin/feature-suggestions?status=${status}`}
            label={`${STATUS_LABEL[status]} (${counts.get(status) ?? 0})`}
            active={activeStatus === status}
          />
        ))}
      </nav>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center text-sm text-[var(--muted)]">
          {activeStatus ? `No suggestions with status "${STATUS_LABEL[activeStatus]}".` : "No suggestions yet."}
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((row) => {
            const contact =
              row.submitterName && row.submitterEmail
                ? `${row.submitterName} · ${row.submitterEmail}`
                : row.submitterEmail || row.submitterName || "Anonymous";
            return (
              <li
                key={row.id}
                className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-900">
                      {STATUS_LABEL[row.status as FeatureSuggestionStatus] ?? row.status}
                    </p>
                    <p className="mt-1 text-sm text-stone-500">
                      {contact}
                      {row.userId ? " · signed in" : ""} · {row.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <FeatureSuggestionRowActions id={row.id} currentStatus={row.status as FeatureSuggestionStatus} />
                </div>
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-stone-800">
                  {row.body}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusChip({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-full bg-amber-900 px-3 py-1 text-xs font-semibold text-amber-50"
          : "rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-700 hover:border-amber-900/30 hover:text-amber-950"
      }
    >
      {label}
    </Link>
  );
}
