import Link from "next/link";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

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

  const [orderAgg, bookingAgg, upcomingSlots, distinctStudents, slotFill, emptySlots, studio] = await Promise.all([
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
      select: { displayName: true, activationPaidAt: true },
    }),
  ]);

  const orderCents = orderAgg._sum.vendorAmountSnapshotCents ?? 0;
  const bookingVendorCents = bookingAgg._sum.vendorAmountCents ?? 0;
  const revenue30dEur = (orderCents + bookingVendorCents) / 100;
  const revenueEstimateNote =
    "Estimate from paid orders and booking vendor share in the last 30 days (before refunds and fees).";

  let occPct: number | null = null;
  if (slotFill.length > 0) {
    const num = slotFill.reduce((s, sl) => s + sl.capacityReserved / Math.max(sl.capacityTotal, 1), 0);
    occPct = Math.round((num / slotFill.length) * 100);
  }

  const lowActivity =
    upcomingSlots.length === 0 && emptySlots > 3
      ? "No bookings in the next week and several empty slots — consider promoting a class."
      : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className={ui.overline}>Today</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">{studio?.displayName}</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          What to do next: review upcoming classes, confirm pending bookings, and keep listings fresh.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Revenue (30d est.)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">€{revenue30dEur.toFixed(2)}</p>
          <p className="mt-2 text-xs text-stone-500">{revenueEstimateNote}</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Active students (90d)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{distinctStudents.length}</p>
          <p className="mt-2 text-xs text-stone-500">Unique customer emails with a booking.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Slot fill (7d)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{occPct !== null ? `${occPct}%` : "—"}</p>
          <p className="mt-2 text-xs text-stone-500">Average reserved vs capacity on open slots.</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Upcoming (7d)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{upcomingSlots.length}</p>
          <p className="mt-2 text-xs text-stone-500">Bookings with a session in the next week.</p>
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
          <h2 className="text-lg font-semibold text-amber-950">Upcoming bookings</h2>
          <Link href={`/dashboard/${studioId}/bookings`} className={`${ui.buttonGhost} text-sm text-amber-900`}>
            View all
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
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{b.bookingStatus}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-amber-950">AI insights preview</h2>
        <p className="mt-1 text-sm text-stone-600">Short signals only — unlock full analysis when billing is connected.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {[
            { t: "Pricing may be below similar studios", p: "Unlock from €2.00" },
            { t: "A weekday slot pattern looks weak", p: "Unlock from €1.50" },
            { t: "Retention could be stronger", p: "Unlock from €3.50" },
          ].map((c) => (
            <div key={c.t} className={ui.cardMuted}>
              <p className="text-sm font-medium text-amber-950">{c.t}</p>
              <p className="mt-3 text-xs text-stone-500">{c.p}</p>
              <Link href={`/dashboard/${studioId}/ai`} className={`${ui.buttonSecondary} mt-4 w-full text-center text-xs`}>
                View AI Advisor
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
