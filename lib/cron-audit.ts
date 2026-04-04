import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Append-only record of a cron run for the operations dashboard (no actor). */
export async function logCronRun(jobKey: string, summary: Record<string, unknown>) {
  try {
    await prisma.adminAuditLog.create({
      data: {
        action: "cron.run",
        entityType: "cron_job",
        entityId: jobKey.slice(0, 120),
        afterJson: JSON.parse(JSON.stringify(summary)) as Prisma.InputJsonValue,
      },
    });
  } catch (e) {
    console.error("[logCronRun]", jobKey, e);
  }
}
