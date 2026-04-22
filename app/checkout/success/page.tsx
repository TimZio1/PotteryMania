import type { Metadata } from "next";
import Link from "next/link";
import { metaPublicPage } from "@/lib/seo-routes";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { AddToCalendarButtons } from "@/components/bookings/add-to-calendar-buttons";
import { buildTicketQrDataUrl } from "@/lib/bookings/ticket-qr";

export const metadata: Metadata = metaPublicPage(
  "You’re all set",
  "/checkout/success",
  "Payment received. Your tickets and next steps are below.",
);

function humanBookingStatus(status: string): string {
  switch (status) {
    case "awaiting_vendor_approval":
      return "Waiting on the studio";
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "cancellation_requested":
      return "Cancellation requested";
    case "completed":
      return "Attended";
    case "no_show":
      return "No-show";
    case "cancelled_by_customer":
      return "Cancelled";
    case "cancelled_by_vendor":
      return "Cancelled by the studio";
    case "cancelled_by_admin":
      return "Cancelled by admin";
    case "refunded":
      return "Refunded";
    case "partially_refunded":
      return "Partially refunded";
    default:
      return status.replace(/_/g, " ").replace("vendor", "studio");
  }
}

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ session_id?: string; orderId?: string }> };

async function resolveCheckoutSuccessOrder(input: { sessionId?: string; orderId?: string; userId?: string }) {
  const providedOrderId = input.orderId?.trim();
  if (input.sessionId) {
    const order = await prisma.order.findFirst({
      where: { stripeCheckoutSessionId: input.sessionId },
      select: { id: true, paymentStatus: true },
    });
    if (!order) {
      return { orderId: null, paymentStatus: null as string | null };
    }
    return { orderId: order.id, paymentStatus: order.paymentStatus };
  }

  if (!providedOrderId) {
    return { orderId: null, paymentStatus: null as string | null };
  }

  const order = await prisma.order.findUnique({
    where: { id: providedOrderId },
    select: { id: true, customerUserId: true, paymentStatus: true },
  });
  if (!order) {
    return { orderId: null, paymentStatus: null as string | null };
  }

  // For orderId-only links, show checkout details only to the order owner.
  if (!input.userId || order.customerUserId !== input.userId) {
    return { orderId: null, paymentStatus: null as string | null };
  }

  return { orderId: order.id, paymentStatus: order.paymentStatus };
}

async function getBookingsForOrder(orderId: string | null) {
  if (!orderId) return [];

  const items = await prisma.orderItem.findMany({
    where: { orderId, itemType: "booking", bookingId: { not: null } },
    select: { bookingId: true },
  });

  const bookingIds = items.map((i) => i.bookingId).filter(Boolean) as string[];
  if (!bookingIds.length) return [];

  return prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: {
      experience: { select: { title: true, loyaltyPointsEarned: true } },
      instructor: { select: { name: true } },
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
  const user = await getSessionUser();
  const successOrder = await resolveCheckoutSuccessOrder({
    sessionId: sp.session_id,
    orderId: sp.orderId,
    userId: user?.id,
  });
  const bookings = await getBookingsForOrder(successOrder.orderId);
  const paymentVerified = successOrder.paymentStatus === "paid" || successOrder.paymentStatus === "partial";
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
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-400">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-[var(--foreground)]">
            {paymentVerified ? "You’re all set" : "Almost there"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            {paymentVerified
              ? "Payment received. We’ve emailed you a confirmation — keep an eye on your inbox."
              : "We’re still confirming your payment with the bank. Refresh in a moment — no need to pay again."}
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
                        <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{b.experience.title}</p>
                      </div>
                      {b.ticketRef && (
                        <span className="shrink-0 rounded-lg bg-amber-100 px-2.5 py-1 font-mono text-xs font-bold text-[var(--accent)]">
                          {b.ticketRef}
                        </span>
                      )}
                    </div>

                    {dateStr && b.slot && (
                      <p className="mt-3 text-sm text-[var(--muted)]">
                        {dateStr} · {b.slot.startTime}–{b.slot.endTime}
                      </p>
                    )}

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      <dt className="text-[var(--muted)]">Guests</dt>
                      <dd className="font-medium text-[var(--foreground)]">{b.participantCount}</dd>
                      {b.instructor?.name ? (
                        <>
                          <dt className="text-[var(--muted)]">Instructor</dt>
                          <dd className="font-medium text-[var(--foreground)]">{b.instructor.name}</dd>
                        </>
                      ) : null}
                      <dt className="text-[var(--muted)]">Status</dt>
                      <dd className="font-medium text-[var(--foreground)]">{humanBookingStatus(b.bookingStatus)}</dd>
                      <dt className="text-[var(--muted)]">Total</dt>
                      <dd className="font-medium text-[var(--foreground)]">€{(b.totalAmountCents / 100).toFixed(2)}</dd>
                      {b.experience.loyaltyPointsEarned > 0 ? (
                        <>
                          <dt className="text-[var(--muted)]">Points earned</dt>
                          <dd className="font-medium text-emerald-400">+{b.experience.loyaltyPointsEarned}</dd>
                        </>
                      ) : null}
                      {b.depositAmountCents > 0 && b.depositAmountCents < b.totalAmountCents && (
                        <>
                          <dt className="text-[var(--muted)]">Paid today</dt>
                          <dd className="font-medium text-[var(--foreground)]">€{(b.depositAmountCents / 100).toFixed(2)}</dd>
                          <dt className="text-[var(--muted)]">Pay on arrival</dt>
                          <dd className="font-medium text-[var(--foreground)]">€{(b.remainingBalanceCents / 100).toFixed(2)}</dd>
                        </>
                      )}
                    </dl>

                    {b.bookingAddOns.length > 0 ? (
                      <div className={`${ui.cardMuted} mt-4`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Extras</p>
                        <ul className="mt-2 space-y-1 text-sm text-[var(--muted)]">
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
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Your answers</p>
                        <dl className="mt-2 space-y-2 text-sm text-[var(--muted)]">
                          {b.intakeResponses.map((entry, index) => (
                            <div key={`${b.id}-intake-${index}`}>
                              <dt className="font-medium text-[var(--foreground)]">{entry.labelSnapshot}</dt>
                              <dd className="whitespace-pre-wrap text-[var(--muted)]">{entry.value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    ) : null}

                    {qrDataUrl ? (
                      <div className={`${ui.cardMuted} mt-4 text-center`}>
                        <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">Your ticket</p>
                        <div className="mt-3 flex justify-center">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={qrDataUrl} alt={`QR ticket for ${b.ticketRef ?? "booking"}`} className="h-40 w-40 rounded-lg bg-[var(--surface)] p-2" />
                        </div>
                        <p className="mt-2 text-xs text-[var(--muted)]">Show this QR code at the studio — or just read out your booking code.</p>
                      </div>
                    ) : null}

                    <div className="mt-4 border-t border-[var(--border)] pt-4">
                      <AddToCalendarButtons bookingId={b.id} bookingStatus={b.bookingStatus} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!hasBookings && (
              <div className={`${ui.card} mx-auto mt-8 max-w-sm text-left`}>
              <h2 className="text-sm font-semibold text-[var(--foreground)]">What happens next</h2>
              <ol className="mt-3 space-y-3 text-sm text-[var(--muted)]">
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-[var(--accent)]">1</span>
                  <span>The studio gets your order and starts getting it ready.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-[var(--accent)]">2</span>
                  <span>Keep an eye on your inbox — receipt and shipping updates come by email.</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-[var(--accent)]">3</span>
                  <span>Sign in any time to see your orders and bookings in one place.</span>
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
            <Link href="/" className={hasBookings ? ui.buttonSecondary : ui.buttonPrimary}>
              Back to home
            </Link>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
