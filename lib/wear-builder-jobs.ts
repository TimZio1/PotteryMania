import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export type EnqueueWearBuilderJobInput = {
  createdByUserId: string | null;
  designImageUrl?: string | null;
  articleCreationPayload?: Prisma.InputJsonValue | null;
  wearProductId?: string | null;
};

/** Persisted draft payload must reference either an image URL or article JSON (or both). */
export function enqueueWearBuilderJob(input: EnqueueWearBuilderJobInput) {
  const url =
    typeof input.designImageUrl === "string" ? input.designImageUrl.trim() : "";
  const hasArticle =
    input.articleCreationPayload != null &&
    typeof input.articleCreationPayload === "object";

  if (!url && !hasArticle) {
    throw new Error("Provide designImageUrl and/or articleCreationPayload");
  }

  return prisma.wearBuilderJob.create({
    data: {
      state: "queued",
      designImageUrl: url || null,
      articleCreationPayload: hasArticle
        ? input.articleCreationPayload!
        : undefined,
      wearProductId: input.wearProductId?.trim() || null,
      createdByUserId: input.createdByUserId,
    },
  });
}
