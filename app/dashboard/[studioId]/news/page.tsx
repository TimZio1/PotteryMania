import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import { StudioPostsClient } from "@/components/dashboard/studio-posts-client";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "News", "news", "Manage studio blog/news updates.");
}

export default async function StudioNewsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const posts = await prisma.studioPost.findMany({
    where: { studioId },
    orderBy: [{ isPublished: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Marketing</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">News / Blog</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Posts power your SEO pages. Use `/api/studios/{studioId}/posts` for create/update/publish.
        </p>
      </div>
      <section className={ui.card}>
        <StudioPostsClient studioId={studioId} initialPosts={posts} />
      </section>
    </div>
  );
}
