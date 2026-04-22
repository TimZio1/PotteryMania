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
  return dashboardStudioMeta(studioId, "Home", "", "Your studio at a glance — this week, earnings, and quick actions.");
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
  const revenueEstimateNote = "Estimate from sales and classes in the last 30 days. Before refunds and card fees.";

  let occPct: number | null = null;
  if (slotFill.length > 0) {
    const num = slotFill.reduce((s, sl) => s + sl.capacityReserved / Math.max(sl.capacityTotal, 1), 0);
    occPct = Math.round((num / slotFill.length) * 100);
  }

  const lowActivity =
    upcomingSlots.length === 0 && emptySlots > 3
      ? "Quiet week — no bookings yet. Share your page or add more class times."
      : null;

  const needsAttentionItems: string[] = [];
  if (emptySlots > 0) {
    needsAttentionItems.push(
      `${emptySlots} open time${emptySlots === 1 ? "" : "s"} this week with no bookings yet.`,
    );
  }
  if (lowActivity) needsAttentionItems.push(lowActivity);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {!studio?.businessTemplateSlug ? (
        <div className="rounded-2xl border border-amber-200/90 bg-linear-to-br from-amber-50/90 to-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <h2 className="text-lg font-semibold text-[var(--foreground)] sm:text-xl">Pick a page style</h2>
          <p className="mt-2 max-w-xl text-sm text-[var(--foreground)]">
            Pick a look that fits your studio. Under a minute. You can change it anytime.
          </p>
          <Link
            href={`/dashboard/${studioId}/site/page`}
            className={`${ui.buttonPrimary} mt-5 inline-flex w-full justify-center sm:w-auto`}
          >
            Pick a style
          </Link>
        </div>
      ) : null}

      <div>
        <p className={ui.overline}>Home</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">{studio?.displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">Your studio at a glance.</p>
      </div>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Needs attention</h2>
        {needsAttentionItems.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">Nothing urgent. You&rsquo;re up to date.</p>
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
          <h2 className="text-lg font-semibold text-[var(--foreground)]">This week&rsquo;s classes</h2>
          <Link href={`/dashboard/${studioId}/schedule/sessions`} className={`${ui.buttonGhost} text-sm text-amber-900`}>
            See all
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {upcomingSlots.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Nothing booked this week yet.</p>
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
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Earnings · last 30 days</p>
            <p className="mt-1 text-2xl font-semibold text-[var(--foreground)]">€{revenue30dEur.toFixed(2)}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{revenueEstimateNote}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/dashboard/${studioId}/money/overview`} className={ui.buttonPrimary}>
              See earnings
            </Link>
            <Link href={`/dashboard/${studioId}/money/activity`} className={ui.buttonSecondary}>
              Recent activity
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Customers (90 days)</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{distinctStudents.length}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">People who booked in the last 90 days.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Seats filled this week</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{occPct !== null ? `${occPct}%` : "—"}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">How full your open classes are this week.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Classes this week</p>
          <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{upcomingSlots.length}</p>
          <p className="mt-2 text-xs text-[var(--muted)]">Booked or approved this week.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Platform fee</p>
          <p className="mt-2 text-base font-semibold text-[var(--foreground)]">
            Shop {(productCommissionBps / 100).toFixed(2)}% · Classes {(bookingCommissionBps / 100).toFixed(2)}%
            {wearMarginLabel ? ` · Wearables ${wearMarginLabel}` : null}
          </p>
          <p className="mt-2 text-xs text-[var(--muted)]">We take this when customers pay.</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Shortcuts</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Common tasks.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/schedule/sessions`} className={ui.buttonPrimary}>
              Today&rsquo;s classes
            </Link>
            <Link href={`/dashboard/${studioId}/guided`} className={ui.buttonSecondary}>
              Simple setup
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Your studio page</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">This is what customers see. Edit the look or add your own domain.</p>
          {activeDomain ? (
            <p className="mt-2 text-xs text-emerald-700">
              Live at <span className="font-medium">{activeDomain.domainName}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-[var(--muted)]">Using the default web address for now.</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/studios/${studioId}`} className={ui.buttonPrimary}>
              View my page
            </Link>
            <Link href={`/dashboard/${studioId}/site/page`} className={ui.buttonSecondary}>
              Edit page
            </Link>
            <Link
              href={`/dashboard/${studioId}/site/domains`}
              className="text-center text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
            >
              Custom domain
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Classes</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Add a class, then add bookable times.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/programs`} className={ui.buttonPrimary}>
              Add a class
            </Link>
            <Link href={`/dashboard/${studioId}/schedule/calendar`} className={ui.buttonSecondary}>
              Open calendar
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Getting paid</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {studio?.activationPaidAt
              ? "You can take payments. See earnings and payouts below."
              : "Connect your bank to start taking payments."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/money/overview`} className={ui.buttonPrimary}>
              See earnings
            </Link>
            <Link href={`/dashboard/studio/${studioId}`} className={ui.buttonSecondary}>
              Business profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
