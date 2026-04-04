import { prisma } from "@/lib/db";

function utcMonthStart(y: number, m: number) {
  return new Date(Date.UTC(y, m, 1));
}

function addMonths(d: Date, delta: number) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1));
}

export type CohortRetentionRow = {
  cohortMonth: string;
  signupCount: number;
  /** Share of cohort with ≥1 order or booking in month index 0..horizon-1 after cohort start (calendar months). */
  retention: number[];
};

/**
 * Cohort = users whose `createdAt` falls in that calendar month (UTC).
 * Activity month k = calendar month offset k from cohort month; user counts if they have an order or booking
 * in that window with `customerUserId` set to their id.
 */
export async function computeCohortRetention(opts: { cohortsBack: number; horizon: number }): Promise<CohortRetentionRow[]> {
  const { cohortsBack, horizon } = opts;
  const now = new Date();
  const endMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const rows: CohortRetentionRow[] = [];

  for (let i = cohortsBack - 1; i >= 0; i--) {
    const cohortStart = utcMonthStart(endMonth.getUTCFullYear(), endMonth.getUTCMonth() - i);
    const cohortEnd = addMonths(cohortStart, 1);

    const users = await prisma.user.findMany({
      where: { createdAt: { gte: cohortStart, lt: cohortEnd } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const signupCount = ids.length;
    const retention: number[] = [];

    if (signupCount === 0) {
      for (let k = 0; k < horizon; k += 1) retention.push(0);
      rows.push({ cohortMonth: cohortStart.toISOString().slice(0, 7), signupCount, retention });
      continue;
    }

    for (let k = 0; k < horizon; k += 1) {
      const ws = addMonths(cohortStart, k);
      const we = addMonths(cohortStart, k + 1);
      const active = new Set<string>();

      const orders = await prisma.order.findMany({
        where: {
          customerUserId: { in: ids },
          createdAt: { gte: ws, lt: we },
        },
        select: { customerUserId: true },
      });
      for (const o of orders) {
        if (o.customerUserId) active.add(o.customerUserId);
      }

      const bookings = await prisma.booking.findMany({
        where: {
          customerUserId: { in: ids },
          createdAt: { gte: ws, lt: we },
        },
        select: { customerUserId: true },
      });
      for (const b of bookings) {
        if (b.customerUserId) active.add(b.customerUserId);
      }

      retention.push(active.size / signupCount);
    }

    rows.push({ cohortMonth: cohortStart.toISOString().slice(0, 7), signupCount, retention });
  }

  return rows;
}
