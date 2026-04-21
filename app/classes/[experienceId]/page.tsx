import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClassBookingForm, type SlotOption, type WaitlistSlotOption } from "./booking-form";
import { seatTypeKeysFromSlot } from "@/lib/bookings/seat-type";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { buildMetadata } from "@/lib/seo";
import { billingIntervalLabel } from "@/lib/offering-pricing";
import { describeCancellationPolicySnapshot } from "@/lib/bookings/cancellation-policy";
import SubscribeButton from "@/components/offerings/subscribe-button";
import { ReviewSummary } from "@/components/review-summary";
import { breadcrumbJsonLd, eventJsonLd, toJsonLdScript } from "@/lib/structured-data";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  try {
    const experiences = await prisma.experience.findMany({
      where: { status: "active", visibility: "public", studio: { status: "approved" } },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
      take: 100,
    });
    return experiences.map((experience) => ({ experienceId: experience.id }));
  } catch {
    return [];
  }
}

type PageProps = {
  params: Promise<{ experienceId: string }>;
  searchParams: Promise<{ slot?: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { experienceId } = await params;
  const experience = await prisma.experience.findFirst({
    where: {
      id: experienceId,
      status: "active",
      visibility: "public",
      studio: {
        status: "approved",
        stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
      },
    },
    include: {
      studio: { select: { displayName: true } },
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
  });

  if (!experience) {
    return buildMetadata({
      title: "Class not found",
      description: "This pottery class or experience could not be found.",
      path: `/classes/${experienceId}`,
    });
  }

  return buildMetadata({
    title: `${experience.title} | ${experience.studio.displayName}`,
    description:
      experience.shortDescription ||
      experience.fullDescription ||
      `Book ${experience.title} with ${experience.studio.displayName}.`,
    path: `/classes/${experienceId}`,
    image: experience.images[0]?.imageUrl,
  });
}

export default async function ClassDetailPage({ params, searchParams }: PageProps) {
  const { experienceId } = await params;
  const sp = await searchParams;
  const initialSlotId = typeof sp.slot === "string" && sp.slot.length > 0 ? sp.slot : undefined;

  const experience = await prisma.experience.findFirst({
    where: {
      id: experienceId,
      status: "active",
      visibility: "public",
      studio: {
        status: "approved",
        stripeAccount: { is: { chargesEnabled: true, payoutsEnabled: true } },
      },
    },
    include: {
      studio: true,
      images: { orderBy: { sortOrder: "asc" } },
      cancellationPolicy: true,
    },
  });

  if (!experience) notFound();

  const reviews = await prisma.review.findMany({
    where: { experienceId, isVisible: true },
    orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
    include: { author: { select: { customerProfile: { select: { fullName: true } } } } },
    take: 8,
  });
  const avgRating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;

  const from = new Date();
  const to = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

  const slotsRaw = await prisma.bookingSlot.findMany({
    where: {
      experienceId,
      slotDate: { gte: from, lte: to },
      status: { in: ["open", "full"] },
    },
    orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
  });

  const cutoffMs = (experience.bookingCutoffHours ?? 0) * 3600_000;
  const nowMs = Date.now();

  const slots: SlotOption[] = slotsRaw
    .filter((s) => {
      const rem = s.capacityTotal - s.capacityReserved;
      if (s.status !== "open" || rem < experience.minimumParticipants) return false;
      if (cutoffMs > 0) {
        const dateStr = s.slotDate.toISOString().slice(0, 10);
        const slotStart = new Date(`${dateStr}T${s.startTime}:00`).getTime();
        if (slotStart - nowMs < cutoffMs) return false;
      }
      return true;
    })
    .map((s) => ({
      id: s.id,
      slotDate: s.slotDate.toISOString(),
      startTime: s.startTime,
      endTime: s.endTime,
      capacityTotal: s.capacityTotal,
      capacityReserved: s.capacityReserved,
      seatPoolKeys: seatTypeKeysFromSlot(s.seatCapacities),
    }));

  const waitlistSlots: WaitlistSlotOption[] = experience.waitlistEnabled
    ? slotsRaw
        .filter((s) => {
          const rem = s.capacityTotal - s.capacityReserved;
          const canBookMinParty = s.status === "open" && rem >= experience.minimumParticipants;
          return !canBookMinParty;
        })
        .map((s) => ({
          id: s.id,
          slotDate: s.slotDate.toISOString(),
          startTime: s.startTime,
          endTime: s.endTime,
          capacityTotal: s.capacityTotal,
          capacityReserved: s.capacityReserved,
          seatPoolKeys: seatTypeKeysFromSlot(s.seatCapacities),
        }))
    : [];

  const price = experience.priceCents / 100;
  const recurring =
    experience.pricingType === "recurring" &&
    experience.recurringPriceCents != null &&
    experience.billingInterval != null;
  const primary = experience.images.find((i) => i.isPrimary) ?? experience.images[0];
  const cancellationPolicyLabel = describeCancellationPolicySnapshot(
    experience.cancellationPolicy
      ? {
          name: experience.cancellationPolicy.name,
          policyType: experience.cancellationPolicy.policyType,
          hoursBeforeStart: experience.cancellationPolicy.hoursBeforeStart,
          refundPercentage: experience.cancellationPolicy.refundPercentage,
          customPolicyText: experience.cancellationPolicy.customPolicyText,
        }
      : null,
  );

  const toolbar = (
    <Breadcrumbs
      items={[
        { label: experience.studio.displayName, href: `/studios/${experience.studio.id}` },
        { label: experience.title },
      ]}
    />
  );
  const firstUpcomingSlot = slots[0];
  const jsonLd = toJsonLdScript([
    eventJsonLd({
      id: experience.id,
      name: experience.title,
      description:
        experience.shortDescription ||
        experience.fullDescription ||
        `Book ${experience.title} with ${experience.studio.displayName}.`,
      image: primary?.imageUrl,
      startDate: firstUpcomingSlot ? `${firstUpcomingSlot.slotDate.slice(0, 10)}T${firstUpcomingSlot.startTime}:00` : undefined,
      locationName: experience.venueName || experience.studio.displayName,
      addressLine1: experience.addressLine1,
      city: experience.city || experience.studio.city,
      country: experience.country || experience.studio.country,
      price: recurring ? ((experience.recurringPriceCents as number) / 100) : price,
      currency: experience.currency,
      organizerName: experience.studio.displayName,
      organizerPath: `/studios/${experience.studio.id}`,
      aggregateRating: reviews.length ? { ratingValue: avgRating, reviewCount: reviews.length } : undefined,
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Classes", path: "/classes" },
      { name: experience.studio.displayName, path: `/studios/${experience.studio.id}` },
      { name: experience.title, path: `/classes/${experience.id}` },
    ]),
  ]);

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} max-w-4xl py-8 sm:py-12`}>
        <p className="text-sm text-[var(--muted)]">
          <Link href={`/studios/${experience.studio.id}`} className="font-medium text-[var(--accent)] hover:underline">
            {experience.studio.displayName}
          </Link>
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">{experience.title}</h1>
          {experience.category && (
            <Link
              href={`/classes?category=${encodeURIComponent(experience.category)}`}
              className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-elevated)]"
            >
              {experience.category}
            </Link>
          )}
        </div>
        <p className="mt-3 text-xl font-medium text-[var(--foreground)]">
          {recurring
            ? `€${((experience.recurringPriceCents as number) / 100).toFixed(2)}/${billingIntervalLabel(
                experience.billingInterval as "weekly" | "monthly" | "custom",
                experience.billingIntervalCount ?? 1,
              )}`
            : `€${price.toFixed(2)} per person`}
        </p>
        {experience.bookingDepositBps > 0 && (
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            You can pay a {(experience.bookingDepositBps / 100).toFixed(1)}% deposit now. The studio collects the rest per their policy.
          </p>
        )}
        {experience.bookingApprovalRequired && (
          <p className="mt-2 max-w-2xl rounded-xl border border-[var(--accent)]/50 bg-[var(--accent-muted)] px-4 py-3 text-sm text-[var(--foreground)]">
            The studio confirms your booking after you pay. You&rsquo;ll see &ldquo;pending&rdquo; until they say yes.
          </p>
        )}
        {(experience.bookingCutoffHours ?? 0) > 0 && (
          <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
            Booking closes {experience.bookingCutoffHours}h before the class.
          </p>
        )}
        {primary?.imageUrl ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primary.imageUrl} alt={experience.title} className="max-h-88 w-full object-cover sm:max-h-96" />
          </div>
        ) : null}
        {experience.shortDescription && <p className="mt-8 text-base text-[var(--muted)]">{experience.shortDescription}</p>}
        {experience.fullDescription && (
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--muted)]">{experience.fullDescription}</div>
        )}
        {cancellationPolicyLabel ? <p className="mt-6 text-xs text-[var(--muted)]">Cancellation: {cancellationPolicyLabel}</p> : null}
        <div className="mt-10 border-t border-[var(--border)] pt-10">
          {recurring ? (
            <>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Start recurring membership</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Clear renewal terms are shown before checkout. Cancelation and trial terms apply as listed below.
              </p>
              <ul className="mt-3 space-y-1 text-xs text-[var(--muted)]">
                <li>Billing cycle: {billingIntervalLabel(experience.billingInterval!, experience.billingIntervalCount ?? 1)}</li>
                <li>Auto-renew: {experience.autoRenew ? "On" : "Off"}</li>
                {experience.minimumCommitmentCycles ? (
                  <li>Minimum commitment: {experience.minimumCommitmentCycles} cycles</li>
                ) : null}
                {experience.trialPeriodDays ? <li>Trial period: {experience.trialPeriodDays} days</li> : null}
                {experience.cancellationPolicyText ? <li>Cancellation: {experience.cancellationPolicyText}</li> : null}
              </ul>
              <div className="mt-4">
                <SubscribeButton offeringType="experience" offeringId={experience.id} cta="Start membership" />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Book your spot</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">Pick a time and how many people.</p>
              <ClassBookingForm
                studioId={experience.studio.id}
                experienceId={experience.id}
                minP={experience.minimumParticipants}
                maxP={experience.maximumParticipants}
                priceCents={experience.priceCents}
                bookingDepositBps={experience.bookingDepositBps}
                allowPayAtStudio={experience.allowPayAtStudio}
                allowFullPaymentOption={experience.allowFullPaymentOption}
                cancellationPolicyLabel={cancellationPolicyLabel}
                slots={slots}
                waitlistSlots={waitlistSlots}
                initialSlotId={initialSlotId}
              />
            </>
          )}
        </div>
        <ReviewSummary title="Class reviews" avgRating={avgRating} count={reviews.length} reviews={reviews} />
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}
