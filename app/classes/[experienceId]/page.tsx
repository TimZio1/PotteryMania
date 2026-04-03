import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClassBookingForm, type SlotOption, type WaitlistSlotOption } from "./booking-form";
import { seatTypeKeysFromSlot } from "@/lib/bookings/seat-type";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ experienceId: string }> };

export default async function ClassDetailPage({ params }: PageProps) {
  const { experienceId } = await params;

  const experience = await prisma.experience.findFirst({
    where: {
      id: experienceId,
      status: "active",
      visibility: "public",
      studio: { status: "approved" },
    },
    include: {
      studio: true,
      images: { orderBy: { sortOrder: "asc" } },
      cancellationPolicy: true,
    },
  });

  if (!experience) notFound();

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

  const slots: SlotOption[] = slotsRaw
    .filter((s) => {
      const rem = s.capacityTotal - s.capacityReserved;
      return s.status === "open" && rem >= experience.minimumParticipants;
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
  const primary = experience.images.find((i) => i.isPrimary) ?? experience.images[0];

  const toolbar = (
    <Link href="/classes" className="text-sm font-medium text-amber-900 hover:text-amber-950">
      ← All classes
    </Link>
  );

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} max-w-4xl py-8 sm:py-12`}>
        <p className="text-sm text-stone-500">
          <Link href={`/studios/${experience.studio.id}`} className="font-medium text-amber-900 hover:underline">
            {experience.studio.displayName}
          </Link>
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">{experience.title}</h1>
        <p className="mt-3 text-xl font-medium text-amber-950">€{price.toFixed(2)} per person</p>
        {experience.bookingDepositBps > 0 && (
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            A deposit may be charged at checkout ({(experience.bookingDepositBps / 100).toFixed(1)}% of the booking
            total). The remainder follows the studio&apos;s policy.
          </p>
        )}
        {experience.bookingApprovalRequired && (
          <p className="mt-2 max-w-2xl rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950">
            This studio confirms bookings after payment — you may see &quot;pending approval&quot; until they accept.
          </p>
        )}
        {primary?.imageUrl ? (
          <div className="mt-8 overflow-hidden rounded-2xl border border-stone-200/90 bg-stone-100 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primary.imageUrl} alt="" className="max-h-[22rem] w-full object-cover sm:max-h-96" />
          </div>
        ) : null}
        {experience.shortDescription && <p className="mt-8 text-base text-stone-700">{experience.shortDescription}</p>}
        {experience.fullDescription && (
          <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{experience.fullDescription}</div>
        )}
        {experience.cancellationPolicy && (
          <p className="mt-6 text-xs text-stone-500">
            Cancellation: {experience.cancellationPolicy.name} ({experience.cancellationPolicy.policyType})
          </p>
        )}
        <div className="mt-10 border-t border-stone-200 pt-10">
          <h2 className="text-lg font-semibold text-amber-950">Book a session</h2>
          <p className="mt-1 text-sm text-stone-600">Choose a time, party size, and seat type when offered.</p>
          <ClassBookingForm
            minP={experience.minimumParticipants}
            maxP={experience.maximumParticipants}
            priceCents={experience.priceCents}
            bookingDepositBps={experience.bookingDepositBps}
            slots={slots}
            waitlistSlots={waitlistSlots}
          />
        </div>
      </main>
    </MarketingLayout>
  );
}
