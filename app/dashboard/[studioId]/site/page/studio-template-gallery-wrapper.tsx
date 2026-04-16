"use client";

import dynamic from "next/dynamic";
import type { BusinessTemplateDefinition } from "@/lib/business-templates";

const StudioTemplateGalleryClient = dynamic(
  () => import("@/components/dashboard/studio-template-gallery-client"),
  { ssr: false },
);

export default function StudioTemplateGalleryWrapper({
  studioId,
  templates,
  initialSlug,
  studioRecommendedSlug,
  defaultTemplateSlug,
}: {
  studioId: string;
  templates: BusinessTemplateDefinition[];
  initialSlug: string | null;
  studioRecommendedSlug: string | null;
  defaultTemplateSlug: string | null;
}) {
  return (
    <StudioTemplateGalleryClient
      studioId={studioId}
      templates={templates}
      initialSlug={initialSlug}
      studioRecommendedSlug={studioRecommendedSlug}
      defaultTemplateSlug={defaultTemplateSlug}
    />
  );
}
