import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}

export default async function StudioCalendarPage({ params }: Props) {
  const { studioId } = await params;
  const monday = startOfWeekMonday(new Date());
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  const slots = await prisma.bookingSlot.findMany({
    where: {
      experience: { studioId },
      slotDate: { gte: monday, lte: sunday },
    },
    orderBy: [{ slotDate: "asc" }, { startTime: "asc" }],
    include: { experience: { select: { id: true, title: true, experienceType: true } } },
  });

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const t = new Date(monday);
    t.setDate(t.getDate() + i);
    days.push(t);
  }

  const byDay = new Map<string, typeof slots>();
  for (const s of slots) {
    const key = s.slotDate.toISOString().slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(s);
    byDay.set(key, arr);
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Schedule</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Calendar</h1>
        <p className="mt-2 text-sm text-stone-600">
          Week of {monday.toISOString().slice(0, 10)} — capacity shows reserved / total per slot.
        </p>
      </div>

      <div className="grid gap-3 lg:grid-cols-7">
        {days.map((d) => {
          const key = d.toISOString().slice(0, 10);
          const list = byDay.get(key) ?? [];
          return (
            <div key={key} className="min-h-[140px] rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </p>
              <p className="text-sm font-medium text-amber-950">{d.getDate()}</p>
              <ul className="mt-2 space-y-2">
                {list.map((sl) => {
                  const fill = sl.capacityTotal > 0 ? Math.round((sl.capacityReserved / sl.capacityTotal) * 100) : 0;
                  return (
                    <li key={sl.id} className="rounded-lg bg-stone-50 px-2 py-1.5 text-xs">
                      <p className="font-medium text-stone-900 line-clamp-2">{sl.experience.title}</p>
                      <p className="text-stone-500">
                        {sl.startTime}–{sl.endTime}
                      </p>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
                        <div className="h-full bg-amber-700" style={{ width: `${fill}%` }} />
                      </div>
                      <p className="mt-0.5 text-[10px] text-stone-500">
                        {sl.capacityReserved}/{sl.capacityTotal} · {sl.status}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-stone-500">
        Drag-and-drop and conflict detection can be added on top of this grid. Manage rules from Classes or the API.
      </p>
    </div>
  );
}
