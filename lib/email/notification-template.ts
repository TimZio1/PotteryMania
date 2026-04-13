import type { NotificationTemplateType } from "@prisma/client";
import { prisma } from "@/lib/db";

export function renderTemplateVariables(template: string, vars: Record<string, string>) {
  let out = template;
  for (const [key, value] of Object.entries(vars)) {
    out = out.replaceAll(`{{${key}}}`, value);
  }
  return out;
}

export async function resolveNotificationTemplate(params: {
  studioId: string;
  templateType: NotificationTemplateType;
  experienceId?: string | null;
}) {
  const scoped = params.experienceId
    ? await prisma.notificationTemplate.findFirst({
        where: {
          studioId: params.studioId,
          templateType: params.templateType,
          isActive: true,
          experienceId: params.experienceId,
        },
        select: { subject: true, bodyHtml: true },
      })
    : null;
  if (scoped) return scoped;

  return prisma.notificationTemplate.findFirst({
    where: {
      studioId: params.studioId,
      templateType: params.templateType,
      isActive: true,
      experienceId: null,
    },
    select: { subject: true, bodyHtml: true },
  });
}
