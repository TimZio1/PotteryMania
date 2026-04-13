import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";

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
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">News / Blog</h1>
        <p className="mt-2 text-sm text-stone-600">
          Posts power your SEO pages. Use `/api/studios/{studioId}/posts` for create/update/publish.
        </p>
      </div>
      <section className={ui.card}>
        {posts.length === 0 ? (
          <p className="text-sm text-stone-600">No posts yet.</p>
        ) : (
          <ul className="space-y-3">
            {posts.map((post) => (
              <li key={post.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-xs text-stone-500">{post.isPublished ? "Published" : "Draft"}</p>
                <p className="mt-1 font-medium text-stone-900">{post.title}</p>
                <p className="text-xs text-stone-500">/{post.slug}</p>
                <p className="mt-2 line-clamp-2 text-sm text-stone-700">{post.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
