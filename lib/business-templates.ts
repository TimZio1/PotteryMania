import type { BusinessTemplate as BusinessTemplateRow } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Serializable template for vendor UI + admin. */
export type BusinessTemplateDefinition = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  businessModelLabel: string;
  bullets: string[];
  priceCents: number;
  currency: string;
  isVisible: boolean;
  isFeatured: boolean;
  isPlatformRecommended: boolean;
  isDefault: boolean;
  sortOrder: number;
  visualTheme: string;
  newSetupSummary: string;
  currentSetupSummary: string;
  whatWillChange: string[];
  expectedImpact: string[];
  successGoalPhrase: string;
  /** Bumps client row state when hyperadmin saves */
  updatedAtIso: string;
};

export function mapBusinessTemplateRow(row: BusinessTemplateRow): BusinessTemplateDefinition {
  const bullets = Array.isArray(row.bullets) ? (row.bullets as unknown[]).filter((x): x is string => typeof x === "string") : [];
  const what = Array.isArray(row.whatWillChange)
    ? (row.whatWillChange as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const impact = Array.isArray(row.expectedImpact)
    ? (row.expectedImpact as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    businessModelLabel: row.businessModelLabel,
    bullets: bullets.slice(0, 3),
    priceCents: row.priceCents,
    currency: row.currency,
    isVisible: row.isVisible,
    isFeatured: row.isFeatured,
    isPlatformRecommended: row.isPlatformRecommended,
    isDefault: row.isDefault,
    sortOrder: row.sortOrder,
    visualTheme: row.visualTheme,
    newSetupSummary: row.newSetupSummary,
    currentSetupSummary: row.currentSetupSummary,
    whatWillChange: what,
    expectedImpact: impact,
    successGoalPhrase: row.successGoalPhrase,
    updatedAtIso: row.updatedAt.toISOString(),
  };
}

export async function listVisibleBusinessTemplates(): Promise<BusinessTemplateDefinition[]> {
  const rows = await prisma.businessTemplate.findMany({
    where: { isVisible: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapBusinessTemplateRow);
}

export async function listAllBusinessTemplatesForAdmin(): Promise<BusinessTemplateDefinition[]> {
  const rows = await prisma.businessTemplate.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
  return rows.map(mapBusinessTemplateRow);
}

/** Resolve active studio template for shell badge — includes hidden templates if already selected. */
export async function getBusinessTemplateBySlug(
  slug: string | null | undefined,
): Promise<BusinessTemplateDefinition | null> {
  if (!slug?.trim()) return null;
  const row = await prisma.businessTemplate.findUnique({ where: { slug: slug.trim() } });
  return row ? mapBusinessTemplateRow(row) : null;
}

export async function getDefaultBusinessTemplateSlug(): Promise<string | null> {
  const row = await prisma.businessTemplate.findFirst({
    where: { isVisible: true, isDefault: true },
    select: { slug: true },
  });
  return row?.slug ?? null;
}

export async function findActivatableBusinessTemplate(slug: string) {
  return prisma.businessTemplate.findFirst({
    where: { slug, isVisible: true },
  });
}

export const BUSINESS_TEMPLATE_NOT_STRUCTURED_LEFT =
  "No template yet — your data is safe. We’ll tune prompts and layout around one clear goal once you choose.";
