import type { PrismaClient } from "@prisma/client";
import { parseFeatureAnalyticsInactiveDays } from "@/lib/admin-feature-analytics";

export { parseFeatureAnalyticsInactiveDays as parseFeatureEventsExportWindowDays };

function utcWindowStartInclusive(windowDays: number): Date {
  const d = Math.min(365, Math.max(7, windowDays));
  const now = new Date();
  const cal = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (d - 1)));
  return new Date(`${cal.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function csvEscape(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function featureActivationEventsExportRows(
  prisma: PrismaClient,
  opts: { windowDays: number; featureId?: string | null },
) {
  const windowDays = Math.min(365, Math.max(7, opts.windowDays));
  const fid = opts.featureId?.trim() || null;
  const from = utcWindowStartInclusive(windowDays);

  return prisma.studioFeatureActivationEvent.findMany({
    where: {
      createdAt: { gte: from },
      ...(fid ? { featureId: fid } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 25_000,
    include: {
      feature: { select: { slug: true } },
      studio: { select: { displayName: true } },
    },
  });
}

export function featureActivationEventsToCsv(
  rows: Awaited<ReturnType<typeof featureActivationEventsExportRows>>,
): string {
  const header = [
    "created_at_utc",
    "kind",
    "feature_slug",
    "studio_name",
    "studio_id",
    "feature_id",
    "stripe_subscription_id",
    "stripe_checkout_session_id",
    "payload_json",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const payload =
      r.payloadJson === null || r.payloadJson === undefined
        ? ""
        : JSON.stringify(r.payloadJson);
    lines.push(
      [
        csvEscape(r.createdAt.toISOString()),
        csvEscape(r.kind),
        csvEscape(r.feature.slug),
        csvEscape(r.studio.displayName),
        csvEscape(r.studioId),
        csvEscape(r.featureId),
        csvEscape(r.stripeSubscriptionId),
        csvEscape(r.stripeCheckoutSessionId),
        csvEscape(payload),
      ].join(","),
    );
  }
  return `\uFEFF${lines.join("\n")}`;
}

export function featureActivationEventsExportFilename(windowDays: number, featureSlug: string | null): string {
  const safe = featureSlug ? featureSlug.replace(/[^a-z0-9_-]+/gi, "_").slice(0, 40) : "all-features";
  return `feature-activation-events-${safe}-${windowDays}d.csv`;
}
