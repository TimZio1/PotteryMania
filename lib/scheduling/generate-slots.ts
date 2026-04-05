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
  capacityTotal: number
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
    return await upsertSlot(experience.id, rule.id, d, startT, endT, cap);
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
      created += await upsertSlot(experience.id, rule.id, d, startT, endT, cap);
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
      created += await upsertSlot(experience.id, rule.id, d, startT, endT, cap);
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
      created += await upsertSlot(experience.id, rule.id, d, startT, endT, cap);
    }
    return created;
  }

  return 0;
}