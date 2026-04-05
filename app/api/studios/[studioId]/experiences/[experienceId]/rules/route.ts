import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import type { ScheduleType } from "@prisma/client";

type Ctx = { params: Promise<{ studioId: string; experienceId: string }> };

const ALLOWED: ScheduleType[] = [
  "one_time",
  "recurring_weekly",
  "recurring_custom_days",
  "manually_added_dates",
  "flexible_window",
];

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, experienceId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const exp = await prisma.experience.findFirst({ where: { id: experienceId, studioId } });
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const scheduleType = body.scheduleType as ScheduleType;
  if (!ALLOWED.includes(scheduleType)) {
    return NextResponse.json({ error: "Invalid scheduleType" }, { status: 400 });
  }

  const startTime = typeof body.startTime === "string" ? body.startTime.trim() : "";
  const endTime = typeof body.endTime === "string" ? body.endTime.trim() : "";
  if (!startTime || !endTime) {
    return NextResponse.json({ error: "startTime and endTime required" }, { status: 400 });
  }

  let weekdays: string[] =
    Array.isArray(body.weekdays) && body.weekdays.every((x) => typeof x === "string")
      ? (body.weekdays as string[]).map((w) => w.toLowerCase().trim())
      : [];

  if (scheduleType === "manually_added_dates") {
    const datesIn =
      Array.isArray(body.dates) && body.dates.every((x) => typeof x === "string")
        ? (body.dates as string[]).map((d) => d.trim())
        : weekdays.filter((d) => ISO_DAY.test(d));
    const unique = [...new Set(datesIn.filter((d) => ISO_DAY.test(d)))];
    if (unique.length === 0) {
      return NextResponse.json(
        { error: "manually_added_dates requires at least one YYYY-MM-DD in dates[]" },
        { status: 400 },
      );
    }
    weekdays = unique;
  }

  const recurrenceStartDate =
    typeof body.recurrenceStartDate === "string" && body.recurrenceStartDate
      ? new Date(body.recurrenceStartDate)
      : null;
  const recurrenceEndDate =
    typeof body.recurrenceEndDate === "string" && body.recurrenceEndDate
      ? new Date(body.recurrenceEndDate)
      : null;

  if (scheduleType === "flexible_window") {
    if (!recurrenceStartDate || !recurrenceEndDate) {
      return NextResponse.json(
        { error: "flexible_window requires recurrenceStartDate and recurrenceEndDate" },
        { status: 400 },
      );
    }
    weekdays = [];
  }

  const capacityPerSlot =
    typeof body.capacityPerSlot === "number" && body.capacityPerSlot >= 1 ? body.capacityPerSlot : null;

  const rule = await prisma.recurringRule.create({
    data: {
      experienceId,
      scheduleType,
      recurrenceStartDate,
      recurrenceEndDate,
      weekdays,
      startTime,
      endTime,
      capacityPerSlot,
      isActive: body.isActive === false ? false : true,
    },
  });

  return NextResponse.json({ rule }, { status: 201 });
}