import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { generateSlotsForRule } from "@/lib/scheduling/generate-slots";

type Ctx = { params: Promise<{ studioId: string }> };

/** Preset weekly slots — plain labels map to sat/sun/wed + local wall-clock times. */
const PRESETS = {
  sat_am: { weekdays: ["sat"], startTime: "10:00", endTime: "12:30" },
  sun_pm: { weekdays: ["sun"], startTime: "14:00", endTime: "17:00" },
  wed_eve: { weekdays: ["wed"], startTime: "18:00", endTime: "20:30" },
} as const;

type PresetKey = keyof typeof PRESETS;

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;

  let body: { experienceId?: string; preset?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const experienceId = typeof body.experienceId === "string" ? body.experienceId.trim() : "";
  const preset = body.preset as PresetKey;
  if (!experienceId || !preset || !(preset in PRESETS)) {
    return NextResponse.json({ error: "experienceId and valid preset required" }, { status: 400 });
  }

  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const exp = await prisma.experience.findFirst({ where: { id: experienceId, studioId } });
  if (!exp) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const p = PRESETS[preset];
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 6);

  /** Deactivate prior rules for this class, then one new active rule (serializable txn reduces double-submit races). */
  const rule = await (async () => {
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx) => {
            await tx.recurringRule.updateMany({
              where: { experienceId: exp.id },
              data: { isActive: false },
            });
            return tx.recurringRule.create({
              data: {
                experienceId: exp.id,
                scheduleType: "recurring_weekly",
                recurrenceStartDate: start,
                recurrenceEndDate: end,
                weekdays: [...p.weekdays],
                startTime: p.startTime,
                endTime: p.endTime,
                capacityPerSlot: exp.capacity,
                isActive: true,
              },
            });
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 8000,
            timeout: 15000,
          },
        );
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2034" && attempt < 3) {
          continue;
        }
        throw e;
      }
    }
    throw new Error("quick-schedule serialization exhausted");
  })();

  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 56);

  const slotsCreated = await generateSlotsForRule(rule, exp, { from, to });

  return NextResponse.json({ rule, slotsCreated }, { status: 201 });
}
