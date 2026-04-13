import { prisma } from "@/lib/db";
import type { RecurringRule, Experience } from "@prisma/client";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

function dayKey(d: Date): string {
  return DAY_NAMES[d.getDay()];
}

function stripTime(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b;
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b;
}

function parseClockMinutes(raw: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return hours * 60 + minutes;
}

function slotRangeForDate(slotDate: Date, startTime: string, endTime: string) {
  const startMinutes = parseClockMinutes(startTime);
  const endMinutes = parseClockMinutes(endTime);
  if (startMinutes == null || endMinutes == null) return null;

  const start = new Date(slotDate);
  start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);

  const end = new Date(slotDate);
  end.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  if (end <= start) {
    end.setDate(end.getDate() + 1);
  }

  return { start, end };
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

async function getBlockedDates(studioId: string, from: Date, to: Date): Promise<Set<string>> {
  const blocks = await prisma.studioDateBlock.findMany({
    where: { studioId, blockDate: { gte: from, lte: to } },
    select: { blockDate: true },
  });
  return new Set(blocks.map((b) => b.blockDate.toISOString().slice(0, 10)));
}

async function upsertSlot(
  experienceId: string,
  recurringRuleId: string | null,
  slotDate: Date,
  startTime: string,
  endTime: string,
  capacityTotal: number,
  bufferMinutesAfter: number,
): Promise<number> {
  const dateOnly = stripTime(slotDate);
  const existing = await prisma.bookingSlot.findFirst({
    where: {
      experienceId,
      recurringRuleId,
      slotDate: dateOnly,
      startTime,
      endTime,
    },
  });
  if (existing) return 0;

  const proposed = slotRangeForDate(dateOnly, startTime, endTime);
  if (!proposed) return 0;

  const scanFrom = new Date(proposed.start);
  scanFrom.setDate(scanFrom.getDate() - 1);
  scanFrom.setHours(0, 0, 0, 0);
  const scanTo = new Date(proposed.end);
  scanTo.setDate(scanTo.getDate() + 1);
  scanTo.setHours(23, 59, 59, 999);

  const nearbySlots = await prisma.bookingSlot.findMany({
    where: {
      experienceId,
      slotDate: { gte: scanFrom, lte: scanTo },
      status: { in: ["open", "full"] },
    },
    select: {
      id: true,
      slotDate: true,
      startTime: true,
      endTime: true,
      experience: { select: { bufferMinutesAfter: true } },
    },
  });

  for (const slot of nearbySlots) {
    const current = slotRangeForDate(slot.slotDate, slot.startTime, slot.endTime);
    if (!current) continue;
    const existingEndWithBuffer = new Date(current.end.getTime() + (slot.experience.bufferMinutesAfter ?? 0) * 60_000);
    const proposedEndWithBuffer = new Date(proposed.end.getTime() + bufferMinutesAfter * 60_000);
    if (overlaps(proposed.start, proposedEndWithBuffer, current.start, existingEndWithBuffer)) {
      return 0;
    }
  }

  await prisma.bookingSlot.create({
    data: {
      experienceId,
      recurringRuleId,
      slotDate: dateOnly,
      startTime,
      endTime,
      capacityTotal,
      capacityReserved: 0,
      status: "open",
    },
  });
  return 1;
}

export async function generateSlotsForRule(
  rule: RecurringRule,
  experience: Experience,
  options: { from: Date; to: Date }
): Promise<number> {
  const from = stripTime(options.from);
  const to = stripTime(options.to);
  if (to < from) return 0;

  const cap = rule.capacityPerSlot ?? experience.capacity;
  const startT = rule.startTime;
  const endT = rule.endTime;
  if (!startT || !endT) return 0;

  const blockedDates = await getBlockedDates(experience.studioId, from, to);
  let created = 0;

  if (rule.scheduleType === "one_time") {
    const d = rule.recurrenceStartDate ? stripTime(new Date(rule.recurrenceStartDate)) : null;
    if (!d || d < from || d > to) return 0;
    if (blockedDates.has(d.toISOString().slice(0, 10))) return 0;
    return await upsertSlot(
      experience.id,
      rule.id,
      d,
      startT,
      endT,
      cap,
      experience.bufferMinutesAfter ?? 0,
    );
  }

  if (rule.scheduleType === "recurring_weekly" || rule.scheduleType === "recurring_custom_days") {
    const ruleStart = rule.recurrenceStartDate ? stripTime(new Date(rule.recurrenceStartDate)) : from;
    const ruleEnd = rule.recurrenceEndDate ? stripTime(new Date(rule.recurrenceEndDate)) : to;
    const cursorStart = maxDate(from, ruleStart);
    const cursorEnd = minDate(to, ruleEnd);
    if (cursorEnd < cursorStart) return 0;

    const wanted = new Set((rule.weekdays || []).map((w) => w.toLowerCase()));

    for (let d = new Date(cursorStart); d <= cursorEnd; d = addDays(d, 1)) {
      if (wanted.size && !wanted.has(dayKey(d))) continue;
      if (blockedDates.has(d.toISOString().slice(0, 10))) continue;
      created += await upsertSlot(
        experience.id,
        rule.id,
        d,
        startT,
        endT,
        cap,
        experience.bufferMinutesAfter ?? 0,
      );
    }
    return created;
  }

  /** Explicit calendar dates stored in `weekdays` as YYYY-MM-DD (not mon/tue/…). */
  if (rule.scheduleType === "manually_added_dates") {
    const isoDay = /^\d{4}-\d{2}-\d{2}$/;
    for (const raw of rule.weekdays || []) {
      const s = String(raw).trim();
      if (!isoDay.test(s)) continue;
      const d = stripTime(new Date(`${s}T12:00:00.000Z`));
      if (d < from || d > to) continue;
      if (blockedDates.has(d.toISOString().slice(0, 10))) continue;
      created += await upsertSlot(
        experience.id,
        rule.id,
        d,
        startT,
        endT,
        cap,
        experience.bufferMinutesAfter ?? 0,
      );
    }
    return created;
  }

  /** One slot per calendar day between recurrenceStartDate and recurrenceEndDate (inclusive). */
  if (rule.scheduleType === "flexible_window") {
    if (!rule.recurrenceStartDate || !rule.recurrenceEndDate) return 0;
    const ruleStart = stripTime(new Date(rule.recurrenceStartDate));
    const ruleEnd = stripTime(new Date(rule.recurrenceEndDate));
    const cursorStart = maxDate(from, ruleStart);
    const cursorEnd = minDate(to, ruleEnd);
    if (cursorEnd < cursorStart) return 0;
    for (let d = new Date(cursorStart); d <= cursorEnd; d = addDays(d, 1)) {
      if (blockedDates.has(d.toISOString().slice(0, 10))) continue;
      created += await upsertSlot(
        experience.id,
        rule.id,
        d,
        startT,
        endT,
        cap,
        experience.bufferMinutesAfter ?? 0,
      );
    }
    return created;
  }

  return 0;
}