import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

type JsonRecord = Record<string, unknown>;

export type AdminAuditInput = {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  before?: Prisma.InputJsonValue | null;
  after?: Prisma.InputJsonValue | null;
  reason?: string | null;
};

function sanitizeJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function logAdminAction(input: AdminAuditInput) {
  const beforeJson = sanitizeJson(input.before);
  const afterJson = sanitizeJson(input.after);
  await prisma.adminAuditLog.create({
    data: {
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      ...(beforeJson !== undefined ? { beforeJson } : {}),
      ...(afterJson !== undefined ? { afterJson } : {}),
      reason: input.reason ?? null,
    },
  });
}

export function diffAuditFields(before: JsonRecord | null, after: JsonRecord | null) {
  const keys = new Set<string>([
    ...Object.keys(before ?? {}),
    ...Object.keys(after ?? {}),
  ]);
  return [...keys]
    .sort()
    .map((key) => ({
      key,
      before: before?.[key],
      after: after?.[key],
      changed: JSON.stringify(before?.[key] ?? null) !== JSON.stringify(after?.[key] ?? null),
    }));
}
