import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { resolveCommissionBps } from "@/lib/commission";
import { resolveWearGlobalPricing, resolveStudioMarginBps } from "@/lib/wear-commission";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Today", "", "Studio control panel home for sessions, revenue, and quick actions.");
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
      wearMarginLabel = `${(bps / 100).toFixed(1)}%`;
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

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      {!studio?.businessTemplateSlug ? (
        <div className="rounded-2xl border border-amber-200/90 bg-linear-to-br from-amber-50/90 to-white px-5 py-6 shadow-sm sm:px-8 sm:py-8">
          <h2 className="text-lg font-semibold text-amber-950 sm:text-xl">Choose how your studio workspace is organized</h2>
          <p className="mt-2 max-w-xl text-sm text-stone-700">
            Pick a template to organize experiences, sessions, payments, and day-to-day studio workflows. Takes under a minute.
          </p>
          <Link
            href={`/dashboard/${studioId}/template`}
            className={`${ui.buttonPrimary} mt-5 inline-flex w-full justify-center sm:w-auto`}
          >
            Choose workspace template
          </Link>
        </div>
      ) : null}

      <div>
        <p className={ui.overline}>Today at your studio</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">{studio?.displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Review upcoming sessions, keep your studio page current, and stay on top of direct bookings and sales.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Direct revenue (30d est.)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">€{revenue30dEur.toFixed(2)}</p>
          <p className="mt-2 text-xs text-stone-500">{revenueEstimateNote}</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Active contacts (90d)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{distinctStudents.length}</p>
          <p className="mt-2 text-xs text-stone-500">Distinct booking email addresses in the last 90 days.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Session fill (7d)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{occPct !== null ? `${occPct}%` : "—"}</p>
          <p className="mt-2 text-xs text-stone-500">Average reserved vs capacity on open slots.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Upcoming sessions (7d)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{upcomingSlots.length}</p>
          <p className="mt-2 text-xs text-stone-500">Confirmed or approved reservations scheduled in the next week.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Platform fee rates</p>
          <p className="mt-2 text-base font-semibold text-amber-950">
            Products {(productCommissionBps / 100).toFixed(2)}% · Bookings {(bookingCommissionBps / 100).toFixed(2)}%
            {wearMarginLabel ? ` · Wearables ${wearMarginLabel} margin` : null}
          </p>
          <p className="mt-2 text-xs text-stone-500">
            Applied automatically to each paid line item during checkout settlement.
            {wearMarginLabel ? " Wearable margins are added on top of base prices." : null}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-amber-950">Quick actions</h2>
          <p className="mt-2 text-sm text-stone-600">Jump straight into the work that keeps your studio moving.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/bookings`} className={ui.buttonPrimary}>
              Open session calendar
            </Link>
            <Link href={`/dashboard/${studioId}/guided`} className={ui.buttonSecondary}>
              Continue guided setup
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-amber-950">Your studio page</h2>
          <p className="mt-2 text-sm text-stone-600">
            Preview the public page your guests see, update the presentation, and connect your own storefront domain when ready.
          </p>
          {activeDomain ? (
            <p className="mt-2 text-xs text-emerald-700">
              Custom storefront domain live: <span className="font-medium">{activeDomain.domainName}</span>
            </p>
          ) : (
            <p className="mt-2 text-xs text-stone-500">No custom storefront domain linked yet.</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/studios/${studioId}`} className={ui.buttonPrimary}>
              View public page
            </Link>
            <Link href={`/dashboard/${studioId}/template`} className={ui.buttonSecondary}>
              Edit page design
            </Link>
            <Link href={`/dashboard/${studioId}/settings`} className={ui.buttonSecondary}>
              Connect domain
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-amber-950">Create experience</h2>
          <p className="mt-2 text-sm text-stone-600">Add a new class or workshop, then schedule times guests can reserve directly.</p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/classes`} className={ui.buttonPrimary}>
              Add experience
            </Link>
            <Link href={`/dashboard/${studioId}/calendar`} className={ui.buttonSecondary}>
              Open schedule
            </Link>
          </div>
        </div>

        <div className={ui.card}>
          <h2 className="text-lg font-semibold text-amber-950">Payments &amp; links</h2>
          <p className="mt-2 text-sm text-stone-600">
            {studio?.activationPaidAt
              ? "Your studio is live for direct payments. Review recent payout activity and linked setup details."
              : "Finish payout setup when you are ready to take direct bookings and product payments."}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <Link href={`/dashboard/${studioId}/payments`} className={ui.buttonPrimary}>
              Open payments
            </Link>
            <Link href={`/dashboard/studio/${studioId}`} className={ui.buttonSecondary}>
              Studio details &amp; payouts
            </Link>
          </div>
        </div>
      </div>

      {(lowActivity || emptySlots > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 sm:p-5">
          <p className="text-sm font-semibold text-amber-950">Alerts</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-amber-900">
            {emptySlots > 0 ? (
              <li>
                {emptySlots} open slot{emptySlots === 1 ? "" : "s"} in the next 7 days still have no bookings.
              </li>
            ) : null}
            {lowActivity ? <li>{lowActivity}</li> : null}
          </ul>
        </div>
      )}

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-amber-950">Upcoming sessions</h2>
          <Link href={`/dashboard/${studioId}/bookings`} className={`${ui.buttonGhost} text-sm text-amber-900`}>
            Open session calendar
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {upcomingSlots.length === 0 ? (
            <p className="text-sm text-stone-600">No sessions in the next week.</p>
          ) : (
            upcomingSlots.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-stone-900">{b.experience.title}</p>
                  <p className="text-stone-500">
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
      </div>
    </div>
  );
}
