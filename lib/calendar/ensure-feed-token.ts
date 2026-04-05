import { randomBytes } from "crypto";
import { prisma } from "@/lib/db";

/** Create or return the user’s secret calendar feed token (ICS/WebCal). */
export async function ensureCalendarFeedToken(userId: string): Promise<string> {
  const row = await prisma.user.findUnique({
    where: { id: userId },
    select: { calendarFeedToken: true },
  });
  if (row?.calendarFeedToken) return row.calendarFeedToken;

  for (let i = 0; i < 5; i++) {
    const token = randomBytes(32).toString("base64url");
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { calendarFeedToken: token },
      });
      return token;
    } catch {
      // rare collision on unique
    }
  }
  throw new Error("Could not allocate calendar feed token");
}
