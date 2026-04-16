"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { overlappingSlotIdsForDay } from "@/lib/calendar/slot-overlap";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

export type CalendarSlotPayload = {
  id: string;
  slotDate: string;
  startTime: string;
  endTime: string;
  capacityTotal: number;
  capacityReserved: number;
  status: string;
  experience: { id: string; title: string; experienceType: string };
};

type Props = {
  studioId: string;
  weekStartIso: string;
  prevWeekIso: string;
  nextWeekIso: string;
  days: { key: string; labelShort: string; dayNum: number }[];
  slots: CalendarSlotPayload[];
};

export default function StudioCalendarClient({
  studioId,
  weekStartIso,
  prevWeekIso,
  nextWeekIso,
  days,
  slots,
}: Props) {
  const [view, setView] = useState<"week" | "day">("week");
  const [dayIndex, setDayIndex] = useState(0);

  const byDay = useMemo(() => {
    const m = new Map<string, CalendarSlotPayload[]>();
    for (const s of slots) {
      const arr = m.get(s.slotDate) ?? [];
      arr.push(s);
      m.set(s.slotDate, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return m;
  }, [slots]);

  const conflictIds = useMemo(() => {
    const all = new Set<string>();
    for (const arr of byDay.values()) {
      const ov = overlappingSlotIdsForDay(arr);
      ov.forEach((id) => all.add(id));
    }
    return all;
  }, [byDay]);

  const scheduleHref = `/dashboard/${studioId}/programs/planner`;

  function SlotCard({ sl }: { sl: CalendarSlotPayload }) {
    const fill = sl.capacityTotal > 0 ? Math.round((sl.capacityReserved / sl.capacityTotal) * 100) : 0;
    const conflict = conflictIds.has(sl.id);
    return (
      <li
        className={cn(
          "rounded-lg px-2 py-1.5 text-xs",
          conflict ? "bg-rose-50 ring-2 ring-rose-300" : "bg-stone-50",
        )}
      >
        <Link href={scheduleHref} className="block font-medium text-stone-900 line-clamp-2 hover:text-amber-900">
          {sl.experience.title}
        </Link>
        <p className="text-stone-500">
          {sl.startTime}–{sl.endTime}
        </p>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200">
          <div className="h-full bg-amber-700" style={{ width: `${fill}%` }} />
        </div>
        <p className="mt-0.5 text-[10px] text-stone-500">
          {sl.capacityReserved}/{sl.capacityTotal} · {sl.status}
          {conflict ? <span className="ml-1 font-semibold text-rose-700">overlap</span> : null}
        </p>
      </li>
    );
  }

  const selectedDay = days[dayIndex] ?? days[0]!;
  const selectedSlots = byDay.get(selectedDay.key) ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/${studioId}/calendar?week=${prevWeekIso}`}
            className={cn(ui.buttonSecondary, "px-3 py-1.5 text-xs")}
          >
            ← Prev week
          </Link>
          <Link
            href={`/dashboard/${studioId}/calendar?week=${nextWeekIso}`}
            className={cn(ui.buttonSecondary, "px-3 py-1.5 text-xs")}
          >
            Next week →
          </Link>
          <Link href={`/dashboard/${studioId}/calendar`} className={cn(ui.buttonSecondary, "px-3 py-1.5 text-xs")}>
            This week
          </Link>
        </div>
        <div className="flex rounded-lg border border-stone-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView("week")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium",
              view === "week" ? "bg-amber-100 text-amber-950" : "text-stone-600 hover:bg-stone-50",
            )}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setView("day")}
            className={cn(
              "rounded-md px-3 py-1.5 font-medium",
              view === "day" ? "bg-amber-100 text-amber-950" : "text-stone-600 hover:bg-stone-50",
            )}
          >
            Day
          </button>
        </div>
      </div>

      <p className="text-xs text-stone-500">
        Week starting <span className="font-mono">{weekStartIso}</span>. Red outline = overlapping times that day. Edit
        slots from{" "}
        <Link href={`/dashboard/${studioId}/programs/planner`} className="font-medium text-amber-900 underline">
          Class planner
        </Link>
        .
      </p>

      {view === "week" ? (
        <div className="grid gap-3 lg:grid-cols-7">
          {days.map((d) => {
            const list = byDay.get(d.key) ?? [];
            return (
              <div key={d.key} className="min-h-[160px] rounded-xl border border-stone-200 bg-white p-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{d.labelShort}</p>
                <p className="text-sm font-medium text-amber-950">{d.dayNum}</p>
                <ul className="mt-2 space-y-2">
                  {list.map((sl) => (
                    <SlotCard key={sl.id} sl={sl} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1">
            {days.map((d, i) => (
              <button
                key={d.key}
                type="button"
                onClick={() => setDayIndex(i)}
                className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-medium",
                  dayIndex === i ? "border-amber-400 bg-amber-50 text-amber-950" : "border-stone-200 text-stone-600",
                )}
              >
                {d.labelShort} {d.dayNum}
              </button>
            ))}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-amber-950">
              {selectedDay.labelShort} {selectedDay.dayNum}
            </p>
            <ul className="mt-3 space-y-2">
              {selectedSlots.length === 0 ? (
                <li className="text-sm text-stone-500">No sessions this day.</li>
              ) : (
                selectedSlots.map((sl) => <SlotCard key={sl.id} sl={sl} />)
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
