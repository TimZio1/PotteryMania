import { prisma } from "@/lib/db";

function utcMonthStart(y: number, m: number) {
  return new Date(Date.UTC(y, m, 1));
}

function addMonths(d: Date, delta: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

export type StudioAddonCohortRow = {
  cohortMonth: string;
  approvedStudios: number;
  /** Studios with ≥1 non–grant-by-default add-on in a billable state today (current snapshot). */
  withPaidAddonNow: number;
  penetrationPct: number;
};

/**
 * Studio cohort = calendar month of `approvedAt` (UTC). Measures **current** paid add-on penetration
 * among studios approved in that month (honest snapshot — not historical month-end reconstruction).
 */
export async function computeStudioApprovalAddonCohorts(cohortsBack: number): Promise<StudioAddonCohortRow[]> {
  const now = new Date();
  const endMonth = utcMonthStart(now.getUTCFullYear(), now.getUTCMonth());
  const paidFeatureIds = (
    await prisma.platformFeature.findMany({
      where: { grantByDefault: false, isActive: true },
      select: { id: true },
    })
  ).map((f) => f.id);
  const paidSet = new Set(paidFeatureIds);

  const rows: StudioAddonCohortRow[] = [];

  for (let i = cohortsBack - 1; i >= 0; i -= 1) {
    const cohortStart = addMonths(endMonth, -i);
    const cohortEnd = addMonths(cohortStart, 1);
    const studios = await prisma.studio.findMany({
      where: {
        status: "approved",
        OR: [
          { approvedAt: { gte: cohortStart, lt: cohortEnd } },
          {
            approvedAt: null,
            createdAt: { gte: cohortStart, lt: cohortEnd },
          },
        ],
      },
      select: { id: true },
    });
    const studioIds = studios.map((s) => s.id);
    const approvedStudios = studioIds.length;
    if (approvedStudios === 0) {
      rows.push({
        cohortMonth: cohortStart.toISOString().slice(0, 7),
        approvedStudios: 0,
        withPaidAddonNow: 0,
        penetrationPct: 0,
      });
      continue;
    }

    const acts = await prisma.studioFeatureActivation.findMany({
      where: {
        studioId: { in: studioIds },
        featureId: { in: [...paidSet] },
        status: { in: ["active", "trialing", "pending_cancel"] },
      },
      select: { studioId: true },
    });
    const withAddon = new Set(acts.map((a) => a.studioId));
    const withPaidAddonNow = withAddon.size;
    rows.push({
      cohortMonth: cohortStart.toISOString().slice(0, 7),
      approvedStudios,
      withPaidAddonNow,
      penetrationPct: approvedStudios > 0 ? (withPaidAddonNow / approvedStudios) * 100 : 0,
    });
  }

  return rows;
}

export function studioAddonCohortsToCsv(rows: StudioAddonCohortRow[]): string {
  const header = ["cohort_month", "approved_studios", "with_paid_addon_now", "penetration_pct"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.cohortMonth, String(r.approvedStudios), String(r.withPaidAddonNow), r.penetrationPct.toFixed(2)].join(","),
    );
  }
  return lines.join("\n") + "\n";
}
