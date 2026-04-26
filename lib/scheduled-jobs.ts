/**
 * Single source of truth for cron schedules used by the platform.
 *
 * Every entry maps to a Next.js route under `/app/api/cron/.../route.ts`. They are all
 * authenticated with `Authorization: Bearer $CRON_SECRET` (see `lib/cron-auth.ts`).
 *
 * In production we host on Railway, so schedules live in your scheduler (Railway cron,
 * Upstash QStash, GitHub Actions, etc.). This file lets the code reference the canonical
 * cron paths and the *recommended* cadence without duplicating strings across docs.
 */

export type ScheduledJob = {
  /** Stable id used in audit logs (`logCronRun`). */
  id: string;
  /** Path to the Next.js route. */
  path: string;
  /** Human-readable summary for admin surfaces. */
  summary: string;
  /** Crontab in UTC. */
  cron: string;
  /** Tag for filtering/grouping. */
  category: "wear" | "marketplace" | "ops";
  /** When true, this job is required for the apparel-only launch. */
  requiredForApparel: boolean;
};

export const SCHEDULED_JOBS: ScheduledJob[] = [
  {
    id: "wear-catalog-sync",
    path: "/api/cron/wear-catalog-sync",
    summary:
      "Pull every linked Spreadconnect article and refresh list (d2cPrice) + supply (b2bPrice → supplyCostCents) prices, images, variants.",
    cron: "0 4 * * *",
    category: "wear",
    requiredForApparel: true,
  },
  {
    id: "wear-fulfillment-jobs",
    path: "/api/cron/wear-fulfillment-jobs",
    summary: "Process queued Spreadconnect fulfillment jobs (paid orders → submit to SC).",
    cron: "*/5 * * * *",
    category: "wear",
    requiredForApparel: true,
  },
  {
    id: "wear-sku-integrity",
    path: "/api/cron/wear-sku-integrity",
    summary: "Detect duplicate or stale SKUs that would block fulfillment.",
    cron: "0 */6 * * *",
    category: "wear",
    requiredForApparel: true,
  },
  {
    id: "abandoned-carts",
    path: "/api/cron/abandoned-carts",
    summary: "Email customers who left items in their cart.",
    cron: "*/30 * * * *",
    category: "ops",
    requiredForApparel: true,
  },
  {
    id: "review-requests",
    path: "/api/cron/review-requests",
    summary: "Send review requests after delivery.",
    cron: "0 9 * * *",
    category: "ops",
    requiredForApparel: true,
  },
  {
    id: "analytics-snapshots",
    path: "/api/cron/analytics-snapshots",
    summary: "Persist daily analytics snapshots (KPIs, funnels).",
    cron: "10 0 * * *",
    category: "ops",
    requiredForApparel: true,
  },
];

export function findScheduledJob(id: string): ScheduledJob | null {
  return SCHEDULED_JOBS.find((j) => j.id === id) ?? null;
}

export function jobsForApparelLaunch(): ScheduledJob[] {
  return SCHEDULED_JOBS.filter((j) => j.requiredForApparel);
}
