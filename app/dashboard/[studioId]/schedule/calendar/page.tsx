import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import StudioCalendarClient, {
  type CalendarSlotPayload,
} from "@/components/dashboard/studio-calendar-client";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studioId: string }>;
  searchParams?: Promise<{ week?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Calendar", "schedule/calendar", "Studio calendar and slot availability.");
}

function startOfWeekMondayUtc(d: Date): Date {
  const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0));
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setUTCDate(x.getUTCDate() + diff);
  return x;
}

function addDaysUtc(d: Date, n: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function isoDateUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function StudioScheduleCalendarPage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const sp = (await searchParams) ?? {};
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  let anchor = new Date();
  const w = typeof sp.week === "string" ? sp.week.trim() : "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(w)) {
    anchor = new Date(`${w}T12:00:00.000Z`);
    if (Number.isNaN(anchor.getTime())) anchor = new Date();
  }

  const monday = startOfWeekMondayUtc(anchor);
  const sunday = addDaysUtc(monday, 6);
  sunday.setUTCHours(23, 59, 59, 999);

  const slotsRaw = await prisma.bookingSlot.findMany({
    where: {
      experience: { studioId },
      slotDate: { gte: monday, lte: sunday },
    },
    orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
    include: { experience: { select: { id: true, title: true, experienceType: true } } },
  });

  const slots: CalendarSlotPayload[] = slotsRaw.map((s) => ({
    id: s.id,
    slotDate: s.slotDate.toISOString().slice(0, 10),
    startTime: s.startTime,
    endTime: s.endTime,
    capacityTotal: s.capacityTotal,
    capacityReserved: s.capacityReserved,
    status: s.status,
    experience: s.experience,
  }));

  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = addDaysUtc(monday, i);
    days.push({
      key: isoDateUtc(d),
      labelShort: d.toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }),
      dayNum: d.getUTCDate(),
    });
  }

  const prevMonday = addDaysUtc(monday, -7);
  const nextMonday = addDaysUtc(monday, 7);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Schedule</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Calendar</h1>
        <p className="mt-2 text-sm text-stone-600">
          Week / day views, capacity bars, and time-overlap warnings. Drag-and-drop reschedule is not enabled yet — adjust
          rules and slots from Programs.
        </p>
      </div>

      <StudioCalendarClient
        studioId={studioId}
        weekStartIso={isoDateUtc(monday)}
        prevWeekIso={isoDateUtc(prevMonday)}
        nextWeekIso={isoDateUtc(nextMonday)}
        days={days}
        slots={slots}
      />
    </div>
  );
}
