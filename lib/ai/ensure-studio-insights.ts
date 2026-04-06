import type { Prisma, PrismaClient } from "@prisma/client";
import { buildInsightForTemplate, loadStudioInsightContext } from "@/lib/ai/insight-engine";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export type StudioInsightListItemDto = {
  id: string;
  templateSlug: string;
  category: string;
  previewTitle: string;
  previewHook: string;
  potentialBenefit: string;
  priceCents: number;
  status: string;
  expiresAt: string | null;
  generatedAt: string;
  confidenceScore: number | null;
  benchmarkSampleSize: number | null;
  fullAnalysis: unknown | null;
};

/**
 * Expires stale rows, then creates any missing generated insights from active templates.
 */
export async function ensureStudioInsights(prisma: PrismaClient, studioId: string): Promise<void> {
  const now = new Date();

  await prisma.generatedInsight.updateMany({
    where: {
      studioId,
      expiresAt: { lt: now },
      status: { in: ["generated", "viewed", "dismissed"] },
    },
    data: { status: "expired" },
  });

  const ctx = await loadStudioInsightContext(prisma, studioId);
  if (!ctx) return;

  const templates = await prisma.insightTemplate.findMany({
    where: { isActive: true },
    orderBy: { slug: "asc" },
  });

  for (const t of templates) {
    const blocking = await prisma.generatedInsight.findFirst({
      where: {
        studioId,
        templateId: t.id,
        status: { not: "expired" },
      },
    });
    if (blocking) continue;

    const payload = buildInsightForTemplate(t, ctx);
    if (!payload) continue;

    await prisma.generatedInsight.create({
      data: {
        studioId,
        templateId: t.id,
        previewTitle: payload.previewTitle,
        previewHook: payload.previewHook,
        potentialBenefit: payload.potentialBenefit,
        priceCents: payload.priceCents,
        fullAnalysis: payload.fullAnalysis as Prisma.InputJsonValue,
        status: "generated",
        confidenceScore: payload.confidenceScore,
        benchmarkSampleSize: payload.benchmarkSampleSize,
        expiresAt: new Date(now.getTime() + WEEK_MS),
      },
    });
  }
}

export async function listStudioInsightsPayload(
  prisma: PrismaClient,
  studioId: string,
  opts?: { take?: number },
): Promise<StudioInsightListItemDto[]> {
  await ensureStudioInsights(prisma, studioId);

  const rows = await prisma.generatedInsight.findMany({
    where: {
      studioId,
      status: { notIn: ["expired"] },
    },
    include: { template: { select: { slug: true, category: true } } },
    orderBy: { generatedAt: "desc" },
    take: opts?.take ?? 24,
  });

  const sorted = [...rows].sort((a, b) => {
    const pa = a.status === "purchased" ? 0 : 1;
    const pb = b.status === "purchased" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return b.priceCents - a.priceCents;
  });

  return sorted.map((r) => {
    const purchased = r.status === "purchased";
    return {
      id: r.id,
      templateSlug: r.template.slug,
      category: r.template.category,
      previewTitle: r.previewTitle,
      previewHook: r.previewHook,
      potentialBenefit: r.potentialBenefit,
      priceCents: r.priceCents,
      status: r.status,
      expiresAt: r.expiresAt?.toISOString() ?? null,
      generatedAt: r.generatedAt.toISOString(),
      confidenceScore: r.confidenceScore,
      benchmarkSampleSize: r.benchmarkSampleSize,
      fullAnalysis: purchased ? r.fullAnalysis : null,
    };
  });
}
