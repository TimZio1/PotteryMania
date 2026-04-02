import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ClassBookingForm, type SlotOption, type WaitlistSlotOption } from "./booking-form";
import { seatTypeKeysFromSlot } from "@/lib/bookings/seat-type";

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

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-4xl justify-between text-sm">
          <Link href="/classes" className="text-amber-800">
            ← All classes
          </Link>
          <Link href="/" className="text-stone-600">
            Home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-10">
        <p className="text-sm text-stone-500">
          <Link href={`/studios/${experience.studio.id}`} className="underline">
            {experience.studio.displayName}
          </Link>
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-amber-950">{experience.title}</h1>
        <p className="mt-2 text-lg text-amber-900">€{price.toFixed(2)} per person</p>
        {experience.bookingDepositBps > 0 && (
          <p className="mt-1 text-sm text-stone-600">
            This class may charge a deposit at checkout ({(experience.bookingDepositBps / 100).toFixed(1)}% of the
            booking total); the rest is due later per studio policy.
          </p>
        )}
        {experience.bookingApprovalRequired && (
          <p className="mt-1 text-sm text-amber-900">
            Bookings are confirmed by the studio after payment — you may see “pending approval” until they accept.
          </p>
        )}
        {primary?.imageUrl ? (
          <div className="mt-6 overflow-hidden rounded-lg bg-stone-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={primary.imageUrl} alt="" className="max-h-96 w-full object-cover" />
          </div>
        ) : null}
        {experience.shortDescription && (
          <p className="mt-6 text-stone-700">{experience.shortDescription}</p>
        )}
        {experience.fullDescription && (
          <div className="mt-4 whitespace-pre-wrap text-sm text-stone-600">{experience.fullDescription}</div>
        )}
        {experience.cancellationPolicy && (
          <p className="mt-6 text-xs text-stone-500">
            Cancellation: {experience.cancellationPolicy.name} ({experience.cancellationPolicy.policyType})
          </p>
        )}
        <ClassBookingForm
          minP={experience.minimumParticipants}
          maxP={experience.maximumParticipants}
          priceCents={experience.priceCents}
          bookingDepositBps={experience.bookingDepositBps}
          slots={slots}
          waitlistSlots={waitlistSlots}
        />
      </main>
    </div>
  );
}
