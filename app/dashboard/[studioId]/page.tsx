import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { resolveCommissionBps } from "@/lib/commission";
import {
  formatWearMarginPercentFromBps,
  resolveWearGlobalPricing,
  resolveStudioMarginBps,
} from "@/lib/wear-commission";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Home", "", "Studio control panel home for sessions, revenue, and quick actions.");
}

export default async function StudioPanelHomePage({ params }: Props) {
  const { studioId } = await params;
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const in7 = new Date(dayStart);
  in7.setDate(in7.getDate() + 7);
  const in30 = new Date(dayStart);
  in30.setDate(in30.getDate() + 30);
  const ago90 = new Date(dayStart);
  ago90.setDate(ago90.getDate() - 90);
  const ago30 = new Date(dayStart);
  ago30.setDate(ago30.getDate() - 30);

  const [orderAgg, bookingAgg, upcomingSlots, distinctStudents, slotFill, emptySlots, studio, activeDomain, productCommissionBps, bookingCommissionBps] = await Promise.all([
    prisma.orderItem.aggregate({
      where: {
        vendorId: studioId,
        order: { paymentStatus: "paid", createdAt: { gte: ago30 } },
      },
      _sum: { vendorAmountSnapshotCents: true },
    }),
    prisma.booking.aggregate({
      where: {
        studioId,
        paymentStatus: { in: ["paid", "partial"] },
        bookingStatus: { notIn: ["cancelled_by_customer", "cancelled_by_vendor", "cancelled_by_admin"] },
        createdAt: { gte: ago30 },
      },
      _sum: { vendorAmountCents: true },
    }),
    prisma.booking.findMany({
      where: {
        studioId,
        bookingStatus: { in: ["confirmed", "awaiting_vendor_approval", "completed"] },
        slot: { slotDate: { gte: dayStart, lt: in7 } },
      },
      orderBy: [{ slot: { slotDate: "asc" } }, { slot: { startTime: "asc" } }],
      take: 8,
      include: { experience: { select: { title: true } }, slot: true },
    }),
    prisma.booking.findMany({
      where: {
        studioId,
        createdAt: { gte: ago90 },
        bookingStatus: { in: ["confirmed", "completed", "awaiting_vendor_approval"] },
      },
      distinct: ["customerEmail"],
      select: { customerEmail: true },
    }),
    prisma.bookingSlot.findMany({
      where: {
        experience: { studioId },
        slotDate: { gte: dayStart, lt: in7 },
        status: "open",
      },
      select: { capacityTotal: true, capacityReserved: true },
      take: 200,
    }),
    prisma.bookingSlot.count({
      where: {
        experience: { studioId },
        slotDate: { gte: dayStart, lt: in7 },
        status: "open",
        capacityReserved: 0,
      },
    }),
    prisma.studio.findUnique({
      where: { id: studioId },
      select: { displayName: true, activationPaidAt: true, businessTemplateSlug: true },
    }),
    prisma.vendorDomain.findFirst({
      where: { studioId, isActive: true, verificationStatus: "verified" },
      select: { domainName: true },
    }),
    resolveCommissionBps(studioId, "product"),
    resolveCommissionBps(studioId, "booking"),
  ]);

  let wearMarginLabel: string | null = null;
  try {
    const wearConfig = await prisma.studioWearConfig.findUnique({
      where: { studioId },
      select: { enabled: true, marginBps: true },
    });
    if (wearConfig?.enabled) {
      const global = await resolveWearGlobalPricing();
      const bps = resolveStudioMarginBps(wearConfig.marginBps, global);
      wearMarginLabel = formatWearMarginPercentFromBps(bps);
    }
  } catch { /* wearables not configured */ }

  const orderCents = orderAgg._sum.vendorAmountSnapshotCents ?? 0;
  const bookingVendorCents = bookingAgg._sum.vendorAmountCents ?? 0;
  const revenue30dEur = (orderCents + bookingVendorCents) / 100;
  const revenueEstimateNote =
    "Estimate from paid product sales and booking revenue in the last 30 days (before refunds and fees).";

  let occPct: number | null = null;
  if (slotFill.length > 0) {
    const num = slotFill.reduce((s, sl) => s + sl.capacityReserved / Math.max(sl.capacityTotal, 1), 0);
    occPct = Math.round((num / slotFill.length) * 100);
  }

  const lowActivity =
    upcomingSlots.length === 0 && emptySlots > 3
      ? "No sessions in the next week and several open slots — consider sharing your page or adding new times."
      : null;

  const needsAttentionItems: string[] = [];
  if (emptySlots > 0) {
    needsAttentionItems.push(
      `${emptySlots} open slot${emptySlots === 1 ? "" : "s"} in the next 7 days still have no bookings.`,
    );
  }
  if (lowActivity) needsAttentionItems.push(lowActivity);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {!studio?.businessTemplateSlug ? (
        <div className="rounded-2xl border border-amber-200/90 bg-linear-to-br from-amber-50/90 to-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">Choose how your studio workspace is organized</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--foreground)]">
            Pick a template to organize experiences, sessions, payments, and day-to-day studio workflows. Takes under a minute.
          </p>
          <Link
            href={`/dashboard/${studioId}/site/page`}
            className={`${ui.buttonPrimary} mt-5 inline-flex w-full justify-center sm:w-auto`}
          >
            Choose workspace template
          </Link>
        </div>
      ) : null}

      <div>
        <p className={ui.overline}>Home</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{studio?.displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Operational snapshot: what needs attention first, then today&apos;s sessions, money, and shortcuts.
        </p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Needs attention</h2>
        {needsAttentionItems.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Nothing urgent right now.</p>
        ) : (
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--foreground)]">
            {needsAttentionItems.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Today&apos;s sessions</h2>
          <Link href={`/dashboard/${studioId}/schedule/sessions`} className={`${ui.buttonGhost} text-sm text-amber-900`}>
            Open sessions
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {upcomingSlots.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">No sessions in the next week.</p>
          ) : (
            upcomingSlots.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{b.experience.title}</p>
                  <p className="text-[var(--muted)]">
                    {b.slot.slotDate.toISOString().slice(0, 10)} {b.slot.startTime} · {b.customerName}
                  </p>
                </div>
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">
                  {b.bookingStatus.replace(/_/g, " ").replace("vendor", "studio")}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={`${ui.card} space-y-4`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Money</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">€{revenue30dEur.toFixed(2)}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">Direct revenue (30d est.) — {revenueEstimateNote}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/${studioId}/money/overview`} className={ui.buttonPrimary}>
              Money overview
            </Link>
            <Link href={`/dashboard/${studioId}/money/activity`} className={ui.buttonSecondary}>
              Activity
            </Link>
            <Link href={`/dashboard/${studioId}/money/reports`} className={ui.buttonSecondary}>
              Reports
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Guest contacts (90d)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{distinctStudents.length}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Distinct booking email addresses.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Session fill (7d)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{occPct !== null ? `${occPct}%` : "—"}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Average reserved vs capacity on open slots.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Upcoming sessions (7d)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{upcomingSlots.length}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Confirmed or approved reservations this week.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Platform fee rates</p>
          <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
            Products {(productCommissionBps / 100).toFixed(2)}% · Bookings {(bookingCommissionBps / 100).toFixed(2)}%
            {wearMarginLabel ? ` · Wearables ${wearMarginLabel} margin` : null}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Applied at checkout settlement.
            {wearMarginLabel ? " Wearable margins are added on top of base prices." : null}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Quick actions</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Jump straight into the work that keeps your studio moving.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/schedule/sessions`} className={ui.buttonPrimary}>
              Open sessions
            </Link>
            <Link href={`/dashboard/${studioId}/guided`} className={ui.buttonSecondary}>
              Continue guided setup
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Public page</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Preview the page your guests see, update presentation, and connect a storefront domain when ready.
          </p>
          {activeDomain ? (
            <p className="mt-2 text-xs text-emerald-700">
              Custom domain live: <span className="font-medium">{activeDomain.domainName}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted)]">No custom storefront domain linked yet.</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/studios/${studioId}`} className={ui.buttonPrimary}>
              View public page
            </Link>
            <Link href={`/dashboard/${studioId}/site/page`} className={ui.buttonSecondary}>
              Edit page design
            </Link>
            <Link href={`/dashboard/${studioId}/settings`} className={ui.buttonSecondary}>
              Connect domain
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Programs</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Add a class or workshop, then schedule bookable times.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/programs`} className={ui.buttonPrimary}>
              Add experience
            </Link>
            <Link href={`/dashboard/${studioId}/schedule/calendar`} className={ui.buttonSecondary}>
              Open schedule
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Money &amp; payouts</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {studio?.activationPaidAt
              ? "Your studio is live for direct payments. Review payout activity and Stripe setup."
              : "Finish payout setup when you are ready for direct bookings and sales."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/money/overview`} className={ui.buttonPrimary}>
              Money overview
            </Link>
            <Link href={`/dashboard/studio/${studioId}`} className={ui.buttonSecondary}>
              Legal profile &amp; Stripe
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
