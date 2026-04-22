import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import StudioTemplateGalleryWrapper from "./studio-template-gallery-wrapper";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import {
  getDefaultBusinessTemplateSlug,
  listVisibleBusinessTemplates,
} from "@/lib/business-templates";
import { resolveStudioRecommendedTemplateSlug } from "@/lib/business-template-recommendation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const fetchCache = "force-no-store";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Studio page", "site/page", "Pick how your studio page looks.");
}

export default async function StudioTemplatePage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true, businessTemplateSlug: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const templates = await listVisibleBusinessTemplates();
  const visibleSlugs = new Set(templates.map((t) => t.slug));
  const [studioRecommendedSlug, defaultTemplateSlug] = await Promise.all([
    resolveStudioRecommendedTemplateSlug(studioId, visibleSlugs),
    getDefaultBusinessTemplateSlug(),
  ]);

  return (
    <StudioTemplateGalleryWrapper
      studioId={studioId}
      templates={templates}
      initialSlug={studio.businessTemplateSlug}
      studioRecommendedSlug={studioRecommendedSlug}
      defaultTemplateSlug={defaultTemplateSlug}
    />
  );
}
