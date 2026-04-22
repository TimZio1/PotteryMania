import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioReviewsClient from "@/components/dashboard/studio-reviews-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Reviews",
    "site/reviews",
    "Read feedback, hide what’s off-topic, and feature your best reviews.",
  );
}

export default async function StudioReviewsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const reviews = await prisma.review.findMany({
    where: { studioId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      author: { select: { customerProfile: { select: { fullName: true } } } },
      experience: { select: { title: true } },
    },
    take: 200,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Website</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Reviews</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Read what people say. Hide anything off-topic. Feature your best ones on your studio page.
        </p>
      </div>
      <StudioReviewsClient studioId={studioId} initialReviews={reviews} />
    </div>
  );
}
