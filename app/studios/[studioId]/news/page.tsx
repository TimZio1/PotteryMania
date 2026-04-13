import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  if (!studio) return buildMetadata({ title: "News", description: "Studio news.", path: `/studios/${studioId}/news` });
  return buildMetadata({
    title: `${studio.displayName} — News`,
    description: `Latest updates and posts from ${studio.displayName} on PotteryMania.`,
    path: `/studios/${studioId}/news`,
  });
}

export default async function StudioPublicNewsPage({ params }: Props) {
  const { studioId } = await params;
  const [studio, posts] = await Promise.all([
    prisma.studio.findFirst({
      where: { id: studioId, status: "approved" },
      select: { id: true, displayName: true },
    }),
    prisma.studioPost.findMany({
      where: { studioId, isPublished: true },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 40,
    }),
  ]);
  if (!studio) notFound();

  const toolbar = (
    <Breadcrumbs items={[{ label: studio.displayName, href: `/studios/${studio.id}` }, { label: "News" }]} />
  );

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} max-w-4xl py-8 sm:py-12`}>
        <h1 className="text-3xl font-semibold tracking-tight text-amber-950">{studio.displayName} news</h1>
        <p className="mt-2 text-sm text-stone-600">Updates, announcements, and stories from the studio.</p>

        {posts.length === 0 ? (
          <div className={`${ui.cardMuted} mt-10 max-w-lg`}>
            <p className="font-medium text-stone-800">No posts yet</p>
            <p className="mt-2 text-sm text-stone-600">
              The studio hasn&apos;t published any news yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {posts.map((post) => {
              const dateLabel = (post.publishedAt ?? post.createdAt).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              return (
                <article key={post.id} className="overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
                  {post.imageUrl ? (
                    <Image
                      src={post.imageUrl}
                      alt={post.title}
                      width={1200}
                      height={640}
                      className="aspect-[2/1] w-full object-cover"
                      unoptimized
                    />
                  ) : null}
                  <div className="p-5 sm:p-6">
                    <p className="text-xs font-medium text-stone-400">{dateLabel}</p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-900">{post.title}</h2>
                    <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-stone-600">{post.content}</div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link href={`/studios/${studio.id}`} className={ui.buttonSecondary}>
            Back to {studio.displayName}
          </Link>
        </div>
      </main>
    </MarketingLayout>
  );
}
