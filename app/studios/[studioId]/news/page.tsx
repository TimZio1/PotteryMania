import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = { params: Promise<{ studioId: string }> };

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

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-semibold text-amber-950">{studio.displayName} news</h1>
      <p className="mt-2 text-sm text-stone-600">
        <Link href={`/studios/${studio.id}`} className="underline">
          Back to studio profile
        </Link>
      </p>

      <div className="mt-8 space-y-6">
        {posts.map((post) => (
          <article key={post.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            {post.imageUrl ? (
              <Image src={post.imageUrl} alt={post.title} width={1200} height={640} className="mb-4 h-52 w-full rounded-xl object-cover" unoptimized />
            ) : null}
            <h2 className="text-xl font-semibold text-stone-900">{post.title}</h2>
            <p className="mt-1 text-xs text-stone-500">{(post.publishedAt ?? post.createdAt).toISOString().slice(0, 10)}</p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-stone-700">{post.content}</p>
          </article>
        ))}
        {posts.length === 0 ? <p className="text-sm text-stone-600">No news posts yet.</p> : null}
      </div>
    </main>
  );
}
