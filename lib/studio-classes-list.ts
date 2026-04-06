import type { PrismaClient } from "@prisma/client";

export type StudioClassListRow = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  status: string;
  visibility: string;
  capacity: number;
  minimumParticipants: number;
  maximumParticipants: number;
  priceCents: number;
  currency: string;
  experienceType: string;
  skillLevel: string | null;
  durationMinutes: number;
  bookingApprovalRequired: boolean;
  waitlistEnabled: boolean;
  recurringRulesCount: number;
  nextSlot: {
    slotDate: string;
    startTime: string;
    endTime: string;
    capacityTotal: number;
    capacityReserved: number;
    slotStatus: string;
  } | null;
};

export async function buildStudioClassListRows(prisma: PrismaClient, studioId: string): Promise<StudioClassListRow[]> {
  const experiences = await prisma.experience.findMany({
    where: { studioId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      shortDescription: true,
      status: true,
      visibility: true,
      capacity: true,
      minimumParticipants: true,
      maximumParticipants: true,
      priceCents: true,
      currency: true,
      experienceType: true,
      skillLevel: true,
      durationMinutes: true,
      bookingApprovalRequired: true,
      waitlistEnabled: true,
      _count: { select: { recurringRules: true } },
    },
  });

  const startOfToday = new Date();
  startOfToday.setUTCHours(0, 0, 0, 0);

  const upcomingSlots = await prisma.bookingSlot.findMany({
    where: {
      experience: { studioId },
      slotDate: { gte: startOfToday },
      status: { in: ["open", "full"] },
    },
    orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
    select: {
      experienceId: true,
      slotDate: true,
      startTime: true,
      endTime: true,
      capacityTotal: true,
      capacityReserved: true,
      status: true,
    },
  });

  const nextByExp = new Map<string, (typeof upcomingSlots)[0]>();
  for (const s of upcomingSlots) {
    if (!nextByExp.has(s.experienceId)) nextByExp.set(s.experienceId, s);
  }

  return experiences.map((e) => {
    const slot = nextByExp.get(e.id);
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      shortDescription: e.shortDescription,
      status: e.status,
      visibility: e.visibility,
      capacity: e.capacity,
      minimumParticipants: e.minimumParticipants,
      maximumParticipants: e.maximumParticipants,
      priceCents: e.priceCents,
      currency: e.currency,
      experienceType: e.experienceType,
      skillLevel: e.skillLevel,
      durationMinutes: e.durationMinutes,
      bookingApprovalRequired: e.bookingApprovalRequired,
      waitlistEnabled: e.waitlistEnabled,
      recurringRulesCount: e._count.recurringRules,
      nextSlot: slot
        ? {
            slotDate: slot.slotDate.toISOString().slice(0, 10),
            startTime: slot.startTime,
            endTime: slot.endTime,
            capacityTotal: slot.capacityTotal,
            capacityReserved: slot.capacityReserved,
            slotStatus: slot.status,
          }
        : null,
    };
  });
}
