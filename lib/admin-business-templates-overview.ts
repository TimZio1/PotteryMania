import { prisma } from "@/lib/db";
import { listAllBusinessTemplatesForAdmin } from "@/lib/business-templates";

export async function loadBusinessTemplateAdminOverview() {
  const templates = await listAllBusinessTemplatesForAdmin();

  const since30 = new Date();
  since30.setDate(since30.getDate() - 30);

  const funnel = await prisma.businessTemplateFunnelEvent.groupBy({
    by: ["eventType"],
    where: { createdAt: { gte: since30 } },
    _count: { id: true },
  });

  const activations30d = await prisma.businessTemplateActivationLog.count({
    where: { createdAt: { gte: since30 } },
  });

  const activeBySlug = await prisma.studio.groupBy({
    by: ["businessTemplateSlug"],
    where: { businessTemplateSlug: { not: null } },
    _count: { id: true },
  });

  return {
    templates,
    funnel30d: funnel.map((r) => ({ eventType: r.eventType, count: r._count.id })),
    activations30d,
    activeStudiosBySlug: activeBySlug
      .filter((r) => r.businessTemplateSlug)
      .map((r) => ({ slug: r.businessTemplateSlug as string, studios: r._count.id })),
  };
}
