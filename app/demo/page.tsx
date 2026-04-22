import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MarketingLayout } from "@/components/marketing-layout";
import { ReviewSummary } from "@/components/review-summary";
import { StudioHeroGallery } from "@/components/marketing/studio-hero-gallery";
import { StudioThemeRoot } from "@/components/studio-public/studio-theme-root";
import { buildMetadata } from "@/lib/seo";
import { resolveStudioPublicTheme } from "@/lib/studio-theme/resolve";
import { ui } from "@/lib/ui-styles";

export const metadata: Metadata = buildMetadata({
  title: "Demo | PotteryMania",
  description:
    "A sample studio page: classes, shop, photos, and story — before you build yours.",
  path: "/demo",
});

const demoStudio = {
  activationPaidAt: new Date("2026-04-01T00:00:00Z"),
  publicTheme: {
    themePreset: "warm-minimal",
    primaryTone: "warm_neutral",
    accentTone: "clay",
    fontPair: "serif_editorial",
    layoutMode: "balanced",
    imageStyle: "rounded",
    buttonStyle: "pill",
    cornerStyle: "xl",
    density: "comfortable",
    showSerifHeadings: true,
    useUppercaseLabels: false,
  },
} as const;

const galleryImages = [
  "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=1600&q=80",
] as const;

const classes = [
  {
    title: "Beginner Wheel Throwing",
    schedule: "Wednesdays · 18:30",
    price: "€48",
    body: "A confidence-building first class covering centering, pulling walls, and trimming basics.",
  },
  {
    title: "Glaze Lab Workshop",
    schedule: "Saturdays · 11:00",
    price: "€62",
    body: "Experiment with surface finishes, layering, and test tiles in a guided studio session.",
  },
  {
    title: "Open Studio Session",
    schedule: "Sundays · 14:00",
    price: "€24",
    body: "Open bench time for returning students who just need space to practice.",
  },
] as const;

const products = [
  {
    title: "Sand-speckled breakfast bowl",
    price: "€36",
    image:
      "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Stoneware pour-over set",
    price: "€58",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Olive glaze serving plate",
    price: "€44",
    image:
      "https://images.unsplash.com/photo-1506368249639-73a05d6f6488?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Carved matcha cup",
    price: "€29",
    image:
      "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

const reviews = [
  {
    id: "demo-review-1",
    rating: 5,
    title: "Exactly the kind of studio page I would trust",
    body: "Booking felt clear, the studio looked premium, and the class details answered the questions I usually need to DM about.",
    author: { customerProfile: { fullName: "Sara M." } },
  },
  {
    id: "demo-review-2",
    rating: 5,
    title: "The shop and classes feel like one brand",
    body: "This is the first studio page demo that actually looks like a real ceramics business instead of a generic template.",
    author: { customerProfile: { fullName: "Mika T." } },
  },
] as const;

export default function DemoPage() {
  const theme = resolveStudioPublicTheme(demoStudio);

  return (
    <MarketingLayout
      toolbar={
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Demo" },
          ]}
        />
      }
    >
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <StudioThemeRoot theme={theme}>
          <div className="st-card overflow-hidden">
            <StudioHeroGallery images={[...galleryImages]} />
            <div className="p-6 sm:p-8">
              <p className="st-muted text-sm">Athens, Greece</p>
              <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h1 className="st-h1 text-3xl font-semibold sm:text-4xl">Clay &amp; Fire Studio</h1>
                  <p className="st-accent-text mt-2 text-sm font-medium">Sample studio page: classes, shop, and story in one place.</p>
                </div>
                <span className="st-pill">Demo</span>
              </div>
              <p className="st-body mt-4 max-w-3xl text-base leading-relaxed">
                This is what your customers see: photos, class times, products, and your story — without jumping between apps.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#demo-classes" className="st-btn-primary">
                  Book a class
                </a>
                <a href="#demo-shop" className="st-btn-secondary">
                  Visit shop
                </a>
                <Link href="/dashboard-demo" className="st-btn-secondary">
                  See the admin demo
                </Link>
              </div>
            </div>
          </div>

          <section className="st-section mt-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="st-card p-6 sm:p-8">
                <p className="st-muted text-sm uppercase tracking-wide">Why it works</p>
                <h2 className="st-h2 mt-3 text-2xl font-semibold">One page. Clear next step.</h2>
                <p className="st-body mt-4 text-base leading-relaxed">
                  Visitors see classes, shop, and your story together. They don’t hunt for links in your bio.
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "Strong photos, simple layout",
                    "Classes and shop under one brand",
                    "Clear Book and Buy buttons",
                    "Looks professional from day one",
                  ].map((item) => (
                    <li key={item} className="st-tile p-4 text-sm leading-6">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="st-card overflow-hidden p-0">
                <div className="relative aspect-4/5 min-h-[220px] w-full bg-stone-200/90 sm:min-h-[280px]">
                  <Image
                    src="https://images.unsplash.com/photo-1612196808214-bf7ad7533198?auto=format&fit=crop&w=1400&q=80"
                    alt="Handmade ceramic pieces displayed on a studio shelf"
                    fill
                    sizes="(max-width: 1024px) 100vw, 40vw"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </section>

          <section id="demo-classes" className="st-section mt-6">
            <div className="st-card p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="st-muted text-sm uppercase tracking-wide">Classes</p>
                  <h2 className="st-h2 mt-2 text-2xl font-semibold">Classes on your page</h2>
                </div>
                <Link href="/dashboard/studio/new?setup=bookings" className="st-btn-primary">
                  Start yours
                </Link>
              </div>
              <div className="mt-6 grid gap-4 lg:grid-cols-3">
                {classes.map((item) => (
                  <article key={item.title} className="st-tile p-5">
                    <p className="st-muted text-xs uppercase tracking-wide">{item.schedule}</p>
                    <h3 className="st-h3 mt-2 text-lg font-semibold">{item.title}</h3>
                    <p className="st-body mt-3 text-sm leading-6">{item.body}</p>
                    <div className="mt-5 flex items-center justify-between gap-3">
                      <span className="st-accent-text text-base font-semibold">{item.price}</span>
                      <Link href="/register?callbackUrl=%2Fdemo" className="st-btn-primary text-sm">
                        Try booking
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="demo-shop" className="st-section mt-6">
            <div className="st-card p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="st-muted text-sm uppercase tracking-wide">Shop</p>
                  <h2 className="st-h2 mt-2 text-2xl font-semibold">Shop on the same page</h2>
                </div>
                <Link href="/dashboard/studio/new?setup=shop" className="st-btn-secondary">
                  Add a shop
                </Link>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => (
                  <article key={product.title} className="st-tile overflow-hidden">
                    <div className="relative aspect-square w-full bg-stone-200/90">
                      <Image
                        src={product.image}
                        alt={product.title}
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1280px) 45vw, 22vw"
                        className="object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h3 className="st-h3 text-base font-semibold">{product.title}</h3>
                      <p className="st-accent-text mt-2 text-sm font-semibold">{product.price}</p>
                      <Link href="/register?callbackUrl=%2Fdemo" className="st-btn-primary mt-4 w-full text-sm">
                        Try adding to cart
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="demo-about" className="st-section mt-6">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="st-card overflow-hidden p-0">
                <div className="relative aspect-4/5 min-h-[220px] w-full bg-stone-200/90 sm:min-h-[280px]">
                  <Image
                    src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1400&q=80"
                    alt="Hands shaping clay on a pottery wheel"
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover"
                  />
                </div>
              </div>
              <div className="st-card p-6 sm:p-8">
                <p className="st-muted text-sm uppercase tracking-wide">About</p>
                <h2 className="st-h2 mt-2 text-2xl font-semibold">Your story, plain and simple</h2>
                <p className="st-body mt-4 text-base leading-relaxed">
                  This sample studio teaches wheel and glaze classes and sells small-batch tableware — all explained on one page.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="st-tile p-4 text-sm leading-6">
                    <strong className="block text-(--st-heading)">For your visitors</strong>
                    Photos, prices, and clear Book and Buy buttons.
                  </div>
                  <div className="st-tile p-4 text-sm leading-6">
                    <strong className="block text-(--st-heading)">For you</strong>
                    One home for your classes, shop, and story — instead of five scattered links.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <ReviewSummary
              title="Sample reviews"
              avgRating={5}
              count={reviews.length}
              reviews={[...reviews]}
              studioThemed
            />
          </section>

          <section className="sticky bottom-[max(env(safe-area-inset-bottom),0.75rem)] mt-8">
            <div className="rounded-(--st-radius-lg) border border-(--st-border) bg-(--st-surface-bg) px-5 py-4 shadow-[0_18px_50px_rgba(30,20,14,0.16)] backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-(--st-heading) text-sm font-semibold">This page is a demo.</p>
                  <p className="st-body text-sm">
                    Build your own with your photos, your classes, and your work.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/dashboard/studio/new?setup=both" className="st-btn-primary">
                    Create your studio
                  </Link>
                  <Link href="/dashboard-demo" className="st-btn-secondary">
                    Admin demo
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </StudioThemeRoot>
      </main>
    </MarketingLayout>
  );
}
