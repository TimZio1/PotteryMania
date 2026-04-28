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
      title: "Article not found",
      description: "This article doesn’t exist or was removed.",
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
      <main className={`pm-brand bg-[var(--clay)] text-[var(--ink)] ${ui.pageContainer} py-10 sm:py-16`}>
        <article className="mx-auto max-w-3xl">
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-[var(--ink)]/6 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--shadow)]"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="pm-display mt-8 text-[2.25rem] leading-[0.96] text-[var(--ink)] sm:text-[3rem] lg:text-[3.5rem]">{post.title}</h1>
          <p className="mt-5 text-sm text-[var(--shadow)]">
            {post.author} · {post.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          </p>
          {post.coverImage ? (
            <div className="relative mt-8 aspect-video overflow-hidden rounded-3xl bg-[var(--ink)]/5 ring-1 ring-[var(--ink)]/8">
              <Image src={post.coverImage} alt={post.title} fill sizes="100vw" className="object-cover" />
            </div>
          ) : null}
          <div className="prose prose-neutral prose-headings:font-serif prose-headings:text-[var(--ink)] prose-p:text-[var(--shadow)] prose-a:text-[var(--heat)] prose-strong:text-[var(--ink)] mt-10 max-w-none">
            {post.body.split("\n\n").map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </article>

        {related.length > 0 ? (
          <section className="mx-auto mt-16 max-w-5xl border-t border-[var(--ink)]/10 pt-16">
            <h2 className="font-serif text-2xl font-normal text-[var(--ink)]">More to read</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="rounded-2xl border border-[var(--ink)]/10 bg-white p-5 shadow-[0_14px_40px_-24px_rgba(11,11,11,0.12)] ring-1 ring-[var(--ink)]/5 transition hover:border-[var(--heat)]/35 hover:shadow-md"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--shadow)]">{item.tags[0] ?? "Guide"}</p>
                  <h3 className="mt-3 text-lg font-semibold text-[var(--ink)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[var(--shadow)]">{item.excerpt}</p>
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
