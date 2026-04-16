import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ReviewForm } from "@/components/reviews/review-form";
import { buildMetadata } from "@/lib/seo";

type PageProps = {
  searchParams: Promise<{ booking?: string }>;
};

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Write a review",
  description: "Private review submission page for a completed PotteryMania booking.",
  path: "/reviews/new",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
});

export default async function NewReviewPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const bookingId = typeof sp.booking === "string" ? sp.booking : "";

  const session = await auth();
  if (!session?.user?.id) {
    const callbackPath = bookingId ? `/reviews/new?booking=${encodeURIComponent(bookingId)}` : "/reviews/new";
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackPath)}`);
  }

  if (!bookingId) {
    return (
      <MarketingLayout>
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-amber-950">Review link missing booking</h1>
            <p className="mt-2 text-sm text-stone-600">Open this page from your booking email or your bookings page.</p>
            <p className="mt-4">
              <Link href="/my-bookings" className="text-sm font-medium text-amber-900 underline underline-offset-2">
                Go to my bookings
              </Link>
            </p>
          </div>
        </main>
      </MarketingLayout>
    );
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, customerUserId: session.user.id },
    select: {
      id: true,
      bookingStatus: true,
      slot: { select: { slotDate: true, startTime: true } },
      studio: { select: { displayName: true } },
      experience: { select: { title: true } },
      reviews: {
        where: { authorUserId: session.user.id },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!booking) {
    return (
      <MarketingLayout>
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-amber-950">Booking not found</h1>
            <p className="mt-2 text-sm text-stone-600">This review link does not match any booking in your account.</p>
          </div>
        </main>
      </MarketingLayout>
    );
  }

  if (booking.bookingStatus !== "completed") {
    return (
      <MarketingLayout>
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-amber-950">Class not completed yet</h1>
            <p className="mt-2 text-sm text-stone-600">Reviews are available after the class is marked completed.</p>
          </div>
        </main>
      </MarketingLayout>
    );
  }

  if (booking.reviews.length > 0) {
    return (
      <MarketingLayout>
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-amber-950">Review already submitted</h1>
            <p className="mt-2 text-sm text-stone-600">You have already reviewed this booking.</p>
            <p className="mt-4">
              <Link href="/my-bookings" className="text-sm font-medium text-amber-900 underline underline-offset-2">
                Back to my bookings
              </Link>
            </p>
          </div>
        </main>
      </MarketingLayout>
    );
  }

  const slotDate = `${booking.slot.slotDate.toISOString().slice(0, 10)} at ${booking.slot.startTime}`;

  return (
    <MarketingLayout>
      <main className="mx-auto max-w-2xl px-4 py-10">
        <ReviewForm
          bookingId={booking.id}
          experienceTitle={booking.experience.title}
          studioName={booking.studio.displayName}
          slotDate={slotDate}
        />
      </main>
    </MarketingLayout>
  );
}
