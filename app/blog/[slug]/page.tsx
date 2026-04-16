import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarketingLayout } from "@/components/marketing-layout";
import { getPublishedBlogPost, listBlogStaticParams, listPublishedBlogPosts } from "@/lib/blog";
import { buildMetadata } from "@/lib/seo";
import { articleJsonLd, breadcrumbJsonLd, toJsonLdScript } from "@/lib/structured-data";
import { ui } from "@/lib/ui-styles";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return listBlogStaticParams();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedBlogPost(slug);
  if (!post) {
    return buildMetadata({
      title: "Blog article not found",
      description: "This PotteryMania article could not be found.",
      path: `/blog/${slug}`,
    });
  }
  return buildMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    path: `/blog/${post.slug}`,
    image: post.coverImage ?? undefined,
    keywords: post.tags,
  });
}

export default async function BlogArticlePage({ params }: Props) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([getPublishedBlogPost(slug), listPublishedBlogPosts()]);
  if (!post) notFound();

  const related = allPosts.filter((item) => item.slug !== post.slug).slice(0, 3);
  const toolbar = <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />;
  const jsonLd = toJsonLdScript([
    articleJsonLd({
      path: `/blog/${post.slug}`,
      headline: post.title,
      description: post.seoDescription || post.excerpt,
      datePublished: post.publishedAt.toISOString(),
      dateModified: post.updatedAt.toISOString(),
      image: post.coverImage,
      authorName: post.author,
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
      { name: post.title, path: `/blog/${post.slug}` },
    ]),
  ]);

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} py-10 sm:py-14`}>
        <article className="mx-auto max-w-3xl">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-600">
                {tag}
              </span>
            ))}
          </div>
          <h1 className="mt-5 font-serif text-4xl tracking-tight text-amber-950 sm:text-5xl">{post.title}</h1>
          <p className="mt-4 text-sm text-stone-500">
            {post.author} · {post.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {post.coverImage ? (
            <div className="relative mt-8 aspect-video overflow-hidden rounded-3xl bg-stone-100">
              <Image src={post.coverImage} alt={post.title} fill sizes="100vw" className="object-cover" />
            </div>
          ) : null}
          <div className="prose prose-stone mt-10 max-w-none">
            {post.body.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>

        {related.length > 0 ? (
          <section className="mx-auto mt-16 max-w-5xl">
            <h2 className="text-2xl font-semibold text-amber-950">Related reading</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <Link key={item.slug} href={`/blog/${item.slug}`} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-200 hover:shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">{item.tags[0] ?? "Guide"}</p>
                  <h3 className="mt-3 text-lg font-semibold text-amber-950">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-stone-600">{item.excerpt}</p>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}
