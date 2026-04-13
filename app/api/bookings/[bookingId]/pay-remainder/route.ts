import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getStripe } from "@/lib/stripe";
import { commissionCentsFromLine, resolveCommissionBps } from "@/lib/commission";

type Ctx = { params: Promise<{ bookingId: string }> };

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bookingId } = await ctx.params;
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      studio: true,
      experience: { select: { title: true } },
    },
  });
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  const isCustomer = booking.customerUserId === user.id || booking.customerEmail === user.email;
  const isVendor = booking.studio.ownerUserId === user.id;
  if (!isCustomer && !isVendor) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (booking.remainingBalanceCents <= 0) {
    return NextResponse.json({ error: "No remainder is due" }, { status: 400 });
  }
  if (booking.remainderPaymentLink) {
    return NextResponse.json({ url: booking.remainderPaymentLink, reused: true });
  }

  const stripeRow = await prisma.stripeAccount.findUnique({ where: { studioId: booking.studioId } });
  if (!stripeRow?.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json({ error: "Studio payments are unavailable" }, { status: 400 });
  }

  const bookingBps = await resolveCommissionBps(booking.studioId, "booking");
  const applicationFeeAmount = commissionCentsFromLine(booking.remainingBalanceCents, bookingBps);
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      customer_email: booking.customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: booking.remainingBalanceCents,
            product_data: {
              name: `${booking.experience.title} — remaining balance`,
            },
          },
        },
      ],
      success_url: `${baseUrl()}/my-bookings?remainder_paid=${encodeURIComponent(booking.id)}`,
      cancel_url: `${baseUrl()}/my-bookings?remainder_cancelled=${encodeURIComponent(booking.id)}`,
      payment_intent_data: {
        ...(applicationFeeAmount > 0 ? { application_fee_amount: applicationFeeAmount } : {}),
        metadata: {
          type: "booking_remainder",
          bookingId: booking.id,
        },
      },
      metadata: {
        type: "booking_remainder",
        bookingId: booking.id,
      },
    },
    { stripeAccount: stripeRow.stripeAccountId },
  );

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      remainderPaymentLink: session.url ?? null,
    },
  });

  return NextResponse.json({ url: session.url });
}
