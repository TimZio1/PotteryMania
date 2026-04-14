import type { Metadata } from "next";
import Link from "next/link";
import { metaPublicPage } from "@/lib/seo-routes";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { prisma } from "@/lib/db";
import { AddToCalendarButtons } from "@/components/bookings/add-to-calendar-buttons";
import { buildTicketQrDataUrl } from "@/lib/bookings/ticket-qr";

export const metadata: Metadata = metaPublicPage(
  "Checkout complete",
  "/checkout/success",
  "Your PotteryMania payment was received. View next steps and receipts.",
);

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string; orderId?: string }> };

async function getBookingsForOrder(input: { sessionId?: string; orderId?: string }) {
  const orderId = input.orderId?.trim();
  let resolvedOrderId = orderId || null;
  if (!resolvedOrderId && input.sessionId) {
    const order = await prisma.order.findFirst({
      where: { stripeCheckoutSessionId: input.sessionId },
      select: { id: true },
    });
    resolvedOrderId = order?.id ?? null;
  }
  if (!resolvedOrderId) return [];

  const items = await prisma.orderItem.findMany({
    where: { orderId: resolvedOrderId, itemType: "booking", bookingId: { not: null } },
    select: { bookingId: true },
  });

  const bookingIds = items.map((i) => i.bookingId).filter(Boolean) as string[];
  if (!bookingIds.length) return [];

  return prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: {
      experience: { select: { title: true, loyaltyPointsEarned: true } },
      slot: { select: { slotDate: true, startTime: true, endTime: true } },
      studio: { select: { displayName: true } },
      bookingAddOns: { select: { addOnName: true, quantity: true, unitPriceCents: true } },
      intakeResponses: { select: { labelSnapshot: true, value: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const sp = await searchParams;
  const bookings = await getBookingsForOrder({ sessionId: sp.session_id, orderId: sp.orderId });
  const bookingsWithQr = await Promise.all(
    bookings.map(async (booking) => ({
      booking,
      qrDataUrl: booking.ticketRef ? await buildTicketQrDataUrl(booking.ticketRef) : null,
    })),
  );
  const hasBookings = bookingsWithQr.length > 0;

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-16 sm:py-24`}>
        <div className="mx-auto max-w-lg text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-amber-950">
            {sp.orderId && !sp.session_id ? "Order confirmed" : "Payment received"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            Thank you for your order! If a confirmation email is configured, it should arrive in your inbox shortly.
          </p>

          {hasBookings && (
            <div className="mx-auto mt-8 max-w-sm space-y-4 text-left">
              {bookingsWithQr.map(({ booking: b, qrDataUrl }) => {
                const dateStr = b.slot?.slotDate
                  ? new Date(b.slot.slotDate).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" })
                  : null;
                return (
                  <div key={b.id} className={ui.card}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-400">{b.studio.displayName}</p>
                        <p className="mt-1 text-base font-semibold text-amber-950">{b.experience.title}</p>
                      </div>
                      {b.ticketRef && (
                        <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 font-mono text-xs font-bold text-amber-900">
                          {b.ticketRef}
                        </span>
                      )}
                    </div>

                    {dateStr && b.slot && (
                      <p className="mt-3 text-sm text-stone-600">
                        {dateStr} · {b.slot.startTime}–{b.slot.endTime}
                      </p>
                    )}

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <dt className="text-stone-500">Guests</dt>
                      <dd className="font-medium text-stone-900">{b.participantCount}</dd>
                      <dt className="text-stone-500">Status</dt>
                      <dd className="font-medium text-stone-900">{b.bookingStatus.replace(/_/g, " ")}</dd>
                      <dt className="text-stone-500">Total</dt>
                      <dd className="font-medium text-stone-900">€{(b.totalAmountCents / 100).toFixed(2)}</dd>
                      {b.experience.loyaltyPointsEarned > 0 ? (
                        <>
                          <dt className="text-stone-500">Loyalty reward</dt>
                          <dd className="font-medium text-emerald-700">+{b.experience.loyaltyPointsEarned} pts</dd>
                        </>
                      ) : null}
                      {b.depositAmountCents > 0 && b.depositAmountCents < b.totalAmountCents && (
                        <>
                          <dt className="text-stone-500">Paid now</dt>
                          <dd className="font-medium text-stone-900">€{(b.depositAmountCents / 100).toFixed(2)}</dd>
                          <dt className="text-stone-500">Remaining</dt>
                          <dd className="font-medium text-stone-900">€{(b.remainingBalanceCents / 100).toFixed(2)}</dd>
                        </>
                      )}
                    </dl>

                    {b.bookingAddOns.length > 0 ? (
                      <div className={`${ui.cardMuted} mt-4`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Extras</p>
                        <ul className="mt-2 space-y-1 text-sm text-stone-700">
                          {b.bookingAddOns.map((entry, index) => (
                            <li key={`${b.id}-addon-${index}`}>
                              {entry.addOnName}
                              {entry.quantity > 1 ? ` x${entry.quantity}` : ""} · +€
                              {((entry.unitPriceCents * entry.quantity) / 100).toFixed(2)}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}

                    {b.intakeResponses.length > 0 ? (
                      <div className={`${ui.cardMuted} mt-4`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Your answers</p>
                        <dl className="mt-2 space-y-2 text-sm text-stone-700">
                          {b.intakeResponses.map((entry, index) => (
                            <div key={`${b.id}-intake-${index}`}>
                              <dt className="font-medium text-stone-800">{entry.labelSnapshot}</dt>
                              <dd className="whitespace-pre-wrap text-stone-600">{entry.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}

                    {qrDataUrl ? (
                      <div className={`${ui.cardMuted} mt-4 text-center`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">Check-in ticket</p>
                        <div className="mt-3 flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrDataUrl} alt={`QR ticket for ${b.ticketRef ?? "booking"}`} className="h-40 w-40 rounded-lg bg-white p-2" />
                        </div>
                        <p className="mt-2 text-xs text-stone-500">Show this QR code or your reference at the studio.</p>
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-stone-100 pt-4">
                      <AddToCalendarButtons bookingId={b.id} bookingStatus={b.bookingStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!hasBookings && (
              <div className={`${ui.card} mx-auto mt-8 max-w-sm text-left`}>
              <h2 className="text-sm font-semibold text-amber-950">What happens next</h2>
              <ol className="mt-3 space-y-3 text-sm text-stone-600">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">1</span>
                  <span>The studio receives your order and begins preparing it.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">2</span>
                  <span>For bookings, check your email for date and time details.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-900">3</span>
                  <span>
                    Track everything from your bookings page — including <strong>Add to Google / Outlook / Apple</strong> once you&apos;re
                    signed in.
                  </span>
                </li>
              </ol>
            </div>
          )}

          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {hasBookings && (
              <Link href="/my-bookings" className={ui.buttonPrimary}>
                View my bookings
              </Link>
            )}
            <Link href="/classes" className={hasBookings ? ui.buttonSecondary : ui.buttonPrimary}>
              Browse more classes
            </Link>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
