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
    "Guides for pottery studios, ceramic artists, bookings, ecommerce, SEO, and revenue growth from the PotteryMania editorial team.",
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
      <main className={`${ui.pageContainer} py-10 sm:py-14`}>
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Editorial</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-amber-950 sm:text-5xl">Pottery business and studio growth</h1>
          <p className="mt-4 text-sm leading-7 text-stone-600 sm:text-base">
            Practical guides for pottery studios, ceramic artists, classes, ecommerce, SEO, and calm online growth.
          </p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          {posts.map((post) => (
            <article key={post.slug} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
              {post.coverImage ? (
                <div className="relative aspect-video bg-stone-100">
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
                    <span key={tag} className="rounded-full bg-stone-100 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight text-amber-950">
                  <Link href={`/blog/${post.slug}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="mt-2 text-sm text-stone-500">
                  {post.author} · {post.publishedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <p className="mt-4 text-sm leading-7 text-stone-600">{post.excerpt}</p>
                <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex text-sm font-semibold text-amber-900 underline underline-offset-4">
                  Read article
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
