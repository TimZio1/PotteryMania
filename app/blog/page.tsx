import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbJsonLd, toJsonLdScript } from "@/lib/structured-data";
import { listPublishedBlogPosts } from "@/lib/blog";
import { ui } from "@/lib/ui-styles";

export const metadata: Metadata = buildMetadata({
  title: "Pottery studio blog",
  description:
    "Practical guides for running a pottery studio online — classes, bookings, shop, and growth.",
  path: "/blog",
  keywords: ["pottery studio blog", "ceramic business tips", "pottery ecommerce", "pottery seo"],
});

export default async function BlogIndexPage() {
  const posts = await listPublishedBlogPosts();
  const jsonLd = toJsonLdScript(
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Blog", path: "/blog" },
    ]),
  );

  return (
    <MarketingLayout>
      <main className={`pm-brand bg-[var(--clay)] text-[var(--ink)] ${ui.pageContainer} py-10 sm:py-16`}>
        <div className="max-w-3xl">
          <p className="pm-caption text-[var(--heat)]">Blog</p>
          <h1 className="pm-display mt-6 text-[2.25rem] leading-[0.96] text-[var(--ink)] sm:text-[3rem] lg:text-[3.5rem]">
            Guides for studios
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-[var(--shadow)] sm:text-base">
            Short, practical notes on classes, bookings, shop, and growing your studio online.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="overflow-hidden rounded-3xl border border-[var(--ink)]/10 bg-white shadow-[0_18px_50px_-24px_rgba(11,11,11,0.12)] ring-1 ring-[var(--ink)]/5"
            >
              {post.coverImage ? (
                <div className="relative aspect-video bg-[var(--ink)]/5">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--ink)]/6 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--shadow)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mt-4 font-serif text-2xl font-normal tracking-tight text-[var(--ink)]">
                  <Link href={`/blog/${post.slug}`} className="transition hover:text-[var(--heat)] hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-[var(--shadow)]">
                  {post.author} · {post.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--shadow)]">{post.excerpt}</p>
                <Link
                  href={`/blog/${post.slug}`}
                  className="mt-5 inline-flex text-sm font-semibold uppercase tracking-[0.12em] text-[var(--heat)] underline decoration-[var(--heat)]/40 underline-offset-4 transition hover:text-[var(--ink)]"
                >
                  Read the guide
                </Link>
              </div>
            </article>
          ))}
        </div>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}
