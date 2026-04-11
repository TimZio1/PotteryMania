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
  title: "Demo studio | PotteryMania",
  description:
    "See exactly what a PotteryMania studio page looks like before you sign up: products, classes, story, imagery, and booking flow.",
  path: "/demo",
});

const demoStudio = {
  activationPaidAt: new Date("2026-04-01T00:00:00Z"),
  publicTheme: {
    themePreset: "warm-minimal",
    primaryTone: "warm_neutral",
    accentTone: "terracotta",
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
  "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=80",
  "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=80",
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
    body: "Flexible bench time for returning students who want practice space without the admin chaos.",
  },
] as const;

const products = [
  {
    title: "Sand-speckled breakfast bowl",
    price: "€36",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Stoneware pour-over set",
    price: "€58",
    image:
      "https://images.unsplash.com/photo-1612196808214-b7e239e5fdb0?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Olive glaze serving plate",
    price: "€44",
    image:
      "https://images.unsplash.com/photo-1615485925873-6b52e3c2ed29?auto=format&fit=crop&w=1200&q=80",
  },
  {
    title: "Carved matcha cup",
    price: "€29",
    image:
      "https://images.unsplash.com/photo-1603204077779-bed963ea7dc2?auto=format&fit=crop&w=1200&q=80",
  },
] as const;

const reviews = [
  {
    id: "demo-review-1",
    rating: 5,
    title: "Exactly the kind of studio page I would trust",
    body: "Booking felt clear, the studio looked premium, and the class details answered the questions I usually need to DM about.",
    author: { email: "sa***@gmail.com" },
  },
  {
    id: "demo-review-2",
    rating: 5,
    title: "The shop and classes feel like one brand",
    body: "This is the first studio page demo that actually looks like a real ceramics business instead of a generic template.",
    author: { email: "mi***@icloud.com" },
  },
] as const;

export default function DemoPage() {
  const theme = resolveStudioPublicTheme(demoStudio);

  return (
    <MarketingLayout
      toolbar={
        <Breadcrumbs
          items={[
            { label: "PotteryMania", href: "/" },
            { label: "Demo studio" },
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
                  <p className="st-accent-text mt-2 text-sm font-medium">A warm, modern studio site built for classes, products, and trust.</p>
                </div>
                <span className="st-pill">Demo page</span>
              </div>
              <p className="st-body mt-4 max-w-3xl text-base leading-relaxed">
                This is the kind of public page a pottery studio can launch on PotteryMania: real imagery, a clear story,
                class booking, product sales, and one consistent brand from first click to checkout.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <a href="#demo-classes" className="st-btn-primary">
                  Book a class
                </a>
                <a href="#demo-shop" className="st-btn-secondary">
                  Visit shop
                </a>
                <a href="#demo-about" className="st-btn-secondary">
                  About the studio
                </a>
              </div>
            </div>
          </div>

          <section className="st-section mt-6">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="st-card p-6 sm:p-8">
                <p className="st-muted text-sm uppercase tracking-wide">Why this page converts</p>
                <h2 className="st-h2 mt-3 text-2xl font-semibold">Studio owners need proof before signup.</h2>
                <p className="st-body mt-4 text-base leading-relaxed">
                  PotteryMania gives you one public studio page for your classes, products, and brand story, so customers
                  understand what you offer and trust it quickly.
                </p>
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {[
                    "Beautiful studio presentation with real imagery",
                    "Classes and products under one identity",
                    "Clear booking and buying CTAs",
                    "A site that feels premium from day one",
                  ].map((item) => (
                    <li key={item} className="st-tile p-4 text-sm leading-6">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="st-card overflow-hidden p-0">
                <Image
                  src="https://images.unsplash.com/photo-1576020799627-aeac74d58064?auto=format&fit=crop&w=1400&q=80"
                  alt="Ceramic pieces displayed on a studio shelf"
                  width={1400}
                  height={1100}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </section>

          <section id="demo-classes" className="st-section mt-6">
            <div className="st-card p-6 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="st-muted text-sm uppercase tracking-wide">Classes</p>
                  <h2 className="st-h2 mt-2 text-2xl font-semibold">Bookable experiences under your own studio brand</h2>
                </div>
                <Link href="/register" className="st-btn-primary">
                  Create your studio
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
                      <Link href="/register" className="st-btn-primary text-sm">
                        Book now
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
                  <h2 className="st-h2 mt-2 text-2xl font-semibold">Products that feel like they belong to the same studio</h2>
                </div>
                <Link href="/register" className="st-btn-secondary">
                  Start with shop
                </Link>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => (
                  <article key={product.title} className="st-tile overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.title}
                      width={1200}
                      height={1200}
                      className="aspect-square w-full object-cover"
                    />
                    <div className="p-4">
                      <h3 className="st-h3 text-base font-semibold">{product.title}</h3>
                      <p className="st-accent-text mt-2 text-sm font-semibold">{product.price}</p>
                      <Link href="/register" className="st-btn-primary mt-4 w-full text-sm">
                        Add to cart
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
                <Image
                  src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1400&q=80"
                  alt="Hands shaping clay on a pottery wheel"
                  width={1400}
                  height={1100}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="st-card p-6 sm:p-8">
                <p className="st-muted text-sm uppercase tracking-wide">About</p>
                <h2 className="st-h2 mt-2 text-2xl font-semibold">A page that tells the studio story clearly</h2>
                <p className="st-body mt-4 text-base leading-relaxed">
                  Clay &amp; Fire Studio teaches wheel throwing and glaze workshops while selling small-batch tableware.
                  PotteryMania makes that story easy to understand without forcing visitors to jump between social DMs,
                  generic booking links, and disconnected storefronts.
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="st-tile p-4 text-sm leading-6">
                    <strong className="block text-(--st-heading)">What visitors see</strong>
                    Clear imagery, pricing, booking calls to action, and one premium brand.
                  </div>
                  <div className="st-tile p-4 text-sm leading-6">
                    <strong className="block text-(--st-heading)">What owners get</strong>
                    One page for products, classes, and trust instead of a stack of disconnected tools.
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <ReviewSummary
              title="What this kind of page should make a studio owner feel"
              avgRating={5}
              count={reviews.length}
              reviews={reviews}
              studioThemed
            />
          </section>

          <section className="sticky bottom-4 mt-8">
            <div className="rounded-(--st-radius-lg) border border-(--st-border) bg-(--st-surface-bg) px-5 py-4 shadow-[0_18px_50px_rgba(30,20,14,0.16)] backdrop-blur-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-(--st-heading) text-sm font-semibold">This is a demo studio page.</p>
                  <p className="st-body text-sm">
                    Create your studio to build your own version with your story, products, and classes.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/pricing" className="st-btn-secondary">
                    See plans
                  </Link>
                  <Link href="/register" className="st-btn-primary">
                    Create your studio
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
