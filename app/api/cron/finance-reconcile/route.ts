import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/cron-auth";
import { logCronRun } from "@/lib/cron-audit";
import { prisma } from "@/lib/db";
import { backfillOrdersToLedger, backfillStudioActivationsToLedger } from "@/lib/finance/backfill-commerce";
import { aggregateFinancialSnapshotsForDate } from "@/lib/finance/aggregate-daily";
import { syncStripeBalanceTransactions } from "@/lib/finance/stripe-balance-sync";
import { runFinancialIntelligence } from "@/lib/finance/intelligence";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orderBackfill = await backfillOrdersToLedger(2000);
    const activationBackfill = await backfillStudioActivationsToLedger(2000);
    const stripe = await syncStripeBalanceTransactions(3);

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    await aggregateFinancialSnapshotsForDate(yesterday);
    await aggregateFinancialSnapshotsForDate(new Date());

    const intelligence = await runFinancialIntelligence();

    const threshold = Number(process.env.WEAR_FAILURE_ALERT_THRESHOLD ?? "3");
    const failCount = await prisma.wearAnalyticsEvent.count({
      where: {
        kind: "wear_spreadconnect_failed",
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    let wearFailureAlertCreated = false;
    if (Number.isFinite(threshold) && failCount >= threshold) {
      const recent = await prisma.adminNotification.findFirst({
        where: {
          title: "Wear Spreadconnect failures",
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      });
      if (!recent) {
        await prisma.adminNotification.create({
          data: {
            title: "Wear Spreadconnect failures",
            body: `${failCount} wear_spreadconnect_failed events in the last 24h (threshold ${threshold}). Check /admin/wear-products and Spreadconnect logs.`,
            level: "warning",
          },
        });
        wearFailureAlertCreated = true;
      }
    }

    const body = {
      ok: true as const,
      orderBackfill,
      activationBackfill,
      stripe,
      intelligence,
      wearSpreadconnectFailures24h: failCount,
      wearFailureAlertCreated,
    };
    void logCronRun("finance-reconcile", {
      ok: true,
      orderBackfillProcessed: orderBackfill.processed,
      activationBackfillProcessed: activationBackfill.processed,
      stripeRows: stripe.rows,
      stripeError: stripe.error,
      intelligenceAlerts: intelligence.alerts,
      intelligenceRecommendations: intelligence.recommendations,
      wearSpreadconnectFailures24h: failCount,
      wearFailureAlertCreated,
    });
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    void logCronRun("finance-reconcile", { ok: false, error: message });
    return NextResponse.json({ ok: false, error: "Finance reconcile failed", message }, { status: 500 });
  }
}
