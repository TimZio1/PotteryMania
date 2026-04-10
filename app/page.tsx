import Link from "next/link";
import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { prisma } from "@/lib/db";
import { PROMO_LABEL } from "@/lib/promo";
import { ClarityCardsStagger } from "@/components/marketing/clarity-cards-stagger";
import { FeaturedStudiosRail } from "@/components/marketing/featured-studios-rail";
import { HeroPhotography } from "@/components/marketing/hero-photography";
import { getFeaturedStudiosForSlot } from "@/lib/featured-studios-public";
import { displayedPreRegTotal } from "@/lib/brand";
import { STUDIO_TESTIMONIALS, testimonialAttribution } from "@/lib/marketing-testimonials";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";
import { monthlyLabel, STUDIO_PLANS } from "@/lib/studio-plan-pricing";
import { MARKETING_HERO_PRIMARY } from "@/lib/marketing-hero-variants";

/** Homepage is DB-aware for counters/content and must not prerender at build. */
export const dynamic = "force-dynamic";

async function getPreRegCountSafe() {
  try {
    return await prisma.earlyAccessSignup.count();
  } catch {
    return 0;
  }
}

async function getFeaturedStudiosSafe() {
  try {
    return await getFeaturedStudiosForSlot("homepage_hero");
  } catch {
    return [];
  }
}

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "Stop losing bookings and sales to chaos | PotteryMania",
    description:
      "Sell your work, book your classes, run everything in one place. Replace scattered tools with one studio system. Plans from €19/month · 0% platform commission. Launch 1 May 2026.",
    path: "/",
  });
  return {
    ...base,
    other: {
      "impact-site-verification": IMPACT_SITE_VERIFICATION,
    },
  };
}

const clarityItems = [
  {
    title: "Set up your studio presence",
    body: "Launch a pottery-specific site with your story, visuals, and studio identity.",
  },
  {
    title: "Publish classes and take bookings",
    body: "Offer workshops, recurring sessions, and private classes with booking and payment built in.",
  },
  {
    title: "Sell directly from your studio",
    body: "Run your own pottery shop under your studio brand, on your own studio page.",
  },
  {
    title: "Your page, your domain, your shop",
    body: "A dedicated studio page on PotteryMania, your own shop for work and classes, and room to grow with your own domain when you are ready.",
  },
];

const differentiators = [
  {
    title: "Ceramics only",
    body: "Every detail is shaped around clay, glaze, workshops, and the way real studios work.",
  },
  {
    title: "Studio-first",
    body: "Not a generic storefront. PotteryMania is built for makers who sell, teach, and grow their studio brand.",
  },
  {
    title: "Products and bookings",
    body: "Bring together your pottery shop and class bookings in one place.",
  },
  {
    title: "Premium presentation",
    body: "A warm, gallery-style presentation that respects handmade work and feels worth belonging to.",
  },
];

const trustTags = ["Stoneware", "Porcelain", "Workshops", "Wheel Throwing", "Raku", "Studio Shelf", "Glaze", "Handbuilt"];
const visitorPaths = [
  {
    title: "I run a studio",
    body: "Set up your studio with bookings, shop, or both.",
    href: "/dashboard/studio/new?setup=both",
    cta: "Create your studio",
  },
  {
    title: "I want bookings only",
    body: "Launch classes and workshops first, then add your shop later when ready.",
    href: "/dashboard/studio/new?setup=bookings",
    cta: "Start bookings setup",
  },
  {
    title: "I want shop only",
    body: "Start with your products and brand story, then add classes in a second step.",
    href: "/dashboard/studio/new?setup=shop",
    cta: "Start shop setup",
  },
] as const;
const studioShelfPieces = [
  { x: 220, y: 205, w: 110, h: 140, fill: "#dfc0a3" },
  { x: 370, y: 205, w: 88, h: 120, fill: "#b1774f" },
  { x: 500, y: 202, w: 120, h: 160, fill: "#efdecc" },
  { x: 660, y: 198, w: 92, h: 126, fill: "#c99772" },
  { x: 800, y: 210, w: 125, h: 135, fill: "#e7cfb5" },
  { x: 960, y: 202, w: 88, h: 152, fill: "#b88263" },
];

export default async function Home() {
  const preRegCount = await getPreRegCountSafe();
  const featuredStudios = await getFeaturedStudiosSafe();
  const studioBenefits = [
    "Your page, your domain, your shop — a branded home customers recognize",
    "List products with gallery-quality presentation",
    "Publish workshops and accept bookings online",
    "Pay 0% platform commission on sales and bookings",
    "Receive direct Stripe payouts without admin friction",
    "Build a studio profile that earns trust over time",
    "Grow with a studio-owned public website built for ceramics",
  ];

  return (
    <MarketingLayout>
      <main className="overflow-hidden">
        <AnnouncementStrip
          preRegShown={displayedPreRegTotal(preRegCount)}
        />

        <ImageSection
          tone="hero"
          minHeight="min-h-[84vh] sm:min-h-[90vh]"
          align="bottom"
          artwork={<HeroPhotography />}
          priority
        >
          <p className="inline-flex rounded-full border border-white/20 bg-white/[0.08] px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
            {MARKETING_HERO_PRIMARY.eyebrow}
          </p>
          <h1 className="mt-7 max-w-[18ch] font-serif text-[2.35rem] font-normal leading-[1.05] tracking-[-0.02em] text-white sm:max-w-4xl sm:text-5xl sm:leading-[1.04] lg:text-6xl lg:tracking-[-0.025em]">
            {MARKETING_HERO_PRIMARY.headline}
          </h1>
          <p className="mt-6 max-w-xl text-[1.05rem] leading-relaxed text-white/88 sm:max-w-2xl sm:text-lg sm:leading-8">
            {MARKETING_HERO_PRIMARY.subhead}
          </p>
          <p className="mt-5 max-w-xl text-base font-medium leading-snug text-white/95 sm:max-w-2xl sm:text-lg">
            One checkout, one calendar, one dashboard — built so you get paid, not buried in admin.
          </p>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/70">
            Official launch 1 May 2026 · start free, then plans from €19/month.{" "}
            <span className="text-white/90">0% platform commission</span> on checkout sales and bookings.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:max-w-2xl">
            Replaces the patchwork of DMs, spreadsheets, and generic site builders — without giving up your brand.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/dashboard/studio/new?setup=both" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-8 py-3 text-sm font-medium text-(--brand-ink) shadow-[0_4px_24px_rgba(44,24,16,0.2)] transition hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {MARKETING_HERO_PRIMARY.ctaPrimary}
            </Link>
            <Link href="#clarity" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/35 bg-transparent px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {MARKETING_HERO_PRIMARY.ctaSecondary}
            </Link>
            <Link
              href="/wear/shop"
              className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-8 py-3 text-sm font-medium text-white/95 backdrop-blur-sm transition hover:border-white/40 hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Shop wearables
            </Link>
          </div>
        </ImageSection>

        <section className="border-b border-[rgba(62,42,30,0.35)] bg-gradient-to-b from-[#2a1810] via-[#23150f] to-[#1a100c] text-stone-100">
          <div className={`${ui.pageContainer} py-14 sm:py-20`}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">Money on the table</p>
              <h2 className="mt-5 font-serif text-3xl font-normal leading-[1.12] tracking-[-0.02em] text-white sm:text-4xl">
                This is what&apos;s costing you money
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-stone-400 sm:text-base">
                If any of this sounds familiar, you are leaving bookings and sales on the table every week.
              </p>
            </div>
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {[
                "Customers message you instead of completing real bookings",
                "Deposits and balances slip through — no reliable payment flow",
                "No single structure: calendars, inventory, and DMs don’t talk to each other",
                "No real system — so growth feels like more chaos, not more revenue",
              ].map((line) => (
                <li
                  key={line}
                  className="flex gap-3.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-5 py-4 text-sm leading-relaxed text-stone-200 sm:text-base"
                >
                  <span className="mt-0.5 shrink-0 font-medium text-white/35" aria-hidden>
                    —
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-wrap gap-3">
              <Link
                href="/dashboard/studio/new?setup=both"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-7 py-2.5 text-sm font-medium text-(--brand-ink) shadow-sm transition hover:bg-stone-100"
              >
                Create your studio
              </Link>
              <Link
                href="/pricing"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-7 py-2.5 text-sm font-medium text-white transition hover:border-white/35 hover:bg-white/[0.06]"
              >
                See plans
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-(--brand-line) bg-white">
          <div className={`${ui.pageContainer} py-14 sm:py-16`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">Studios like yours</p>
            <h2 className="mt-4 max-w-xl font-serif text-2xl font-normal leading-tight tracking-[-0.02em] text-(--brand-ink) sm:text-3xl">
              Built to pay for itself
            </h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {STUDIO_TESTIMONIALS.map((t) => (
                <article
                  key={t.studio}
                  className="rounded-3xl border border-stone-200/80 bg-[#fdfcfa] p-6 shadow-[0_1px_0_rgba(28,25,23,0.04)] sm:p-7"
                >
                  <p className="text-[0.9375rem] leading-relaxed text-stone-700">&ldquo;{t.quote}&rdquo;</p>
                  <p className="mt-5 text-xs font-medium uppercase tracking-[0.12em] text-stone-400">
                    {testimonialAttribution(t)}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <FeaturedStudiosRail studios={featuredStudios} />

        <section className="border-b border-(--brand-line) bg-white">
          <div className={`${ui.pageContainer} py-14 sm:py-20`}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">Start in one click</p>
              <h2 className="mt-4 font-serif text-3xl font-normal leading-[1.12] tracking-[-0.02em] text-(--brand-ink) sm:text-4xl">
                Choose your path on PotteryMania.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {visitorPaths.map((path) => (
                <article
                  key={path.title}
                  className="rounded-3xl border border-stone-200/80 bg-white p-7 shadow-[0_2px_20px_rgba(28,25,23,0.04)]"
                >
                  <h3 className="font-serif text-xl font-normal tracking-[-0.01em] text-(--brand-ink) sm:text-2xl">
                    {path.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">{path.body}</p>
                  <Link
                    href={path.href}
                    className={`${ui.buttonGhost} mt-6 inline-flex text-sm font-medium text-amber-950 underline decoration-amber-200/80 underline-offset-4 hover:decoration-amber-400/80`}
                  >
                    {path.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-(--brand-line) bg-(--warm-surface)">
          <div className={`${ui.pageContainer} py-12 sm:py-14`}>
            <div className="flex flex-col gap-6 rounded-3xl border border-stone-200/70 bg-white/90 p-7 shadow-[0_2px_20px_rgba(28,25,23,0.04)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">Pricing model</p>
                <p className="mt-3 text-sm leading-relaxed text-stone-600 sm:text-base">
                  Pay by studio usage: bookings-only, shop-only, both, or pro. Platform commission stays at 0%.
                </p>
                <p className="mt-3 text-sm font-medium text-amber-950">Start free. Upgrade when you&apos;re ready.</p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex text-sm font-medium text-amber-950 underline decoration-amber-200/80 underline-offset-4 transition hover:decoration-amber-500/80"
                >
                  Full comparison →
                </Link>
              </div>
              <ul className="flex flex-wrap gap-2">
                {STUDIO_PLANS.map((plan) => (
                  <li
                    key={plan.key}
                    className="rounded-full border border-stone-200/90 bg-stone-50/80 px-3.5 py-1.5 text-xs font-medium text-stone-600"
                  >
                    {plan.name} · {monthlyLabel(plan)}
                    {plan.recommended ? " · Most popular" : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="clarity" className="border-y border-(--brand-line) bg-(--warm-surface)">
          <div className={`${ui.pageContainer} py-20 sm:py-24`}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-500">What PotteryMania is</p>
              <h2 className="mt-5 font-serif text-3xl font-normal leading-[1.12] tracking-[-0.02em] text-(--brand-ink) sm:text-4xl">
                A clearer, more beautiful digital home for independent ceramics.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
                PotteryMania brings together selling, booking, and day-to-day operations so you spend less time on
                patchwork tools.
              </p>
            </div>
            <ClarityCardsStagger items={clarityItems} />
          </div>
        </section>

        <ImageSection
          tone="studio"
          minHeight="min-h-[62vh] sm:min-h-[74vh]"
          align="center"
          artwork={<StudioArtwork />}
        >
          <div className="max-w-2xl rounded-4xl border border-white/10 bg-black/20 p-6 backdrop-blur-[2px] sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-200">For studio owners</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
              Everything a ceramic studio needs, gathered into one calm, credible place.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-stone-100/90 sm:text-lg">
              PotteryMania helps you present the work beautifully, publish experiences confidently, and look established
              from the first visit.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {studioBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-stone-100 sm:text-base">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs text-white">
                    ✓
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <Link href="/dashboard/studio/new?setup=both" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium text-(--brand-ink) shadow-lg shadow-black/20 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Create your studio
            </Link>
          </div>
        </ImageSection>

        <ImageSection
          tone="showcase"
          minHeight="min-h-[58vh] sm:min-h-[68vh]"
          align="center"
          artwork={<ShelfShowcaseArtwork />}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-200">Studio-owned shop</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
              Your shop lives on your studio page — your brand, your products.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-100/90 sm:text-lg">
              Keep a strong voice, present handmade work with care, and manage products from one dashboard.
            </p>
          </div>
        </ImageSection>

        <section className="border-y border-(--brand-line) bg-(--brand-soft)">
          <div className={`${ui.pageContainer} py-16 sm:py-24`}>
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-600">Why it feels different</p>
                <h2 className="mt-4 font-serif text-3xl leading-tight text-(--brand-ink) sm:text-4xl">
                  PotteryMania is not trying to be everything. That is exactly why it can be right for ceramics.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                  The platform is focused on real studio operations: website, bookings, products, trust, and consistent
                  branding for ceramic businesses.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {differentiators.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[1.6rem] border border-(--brand-line) bg-white p-6 shadow-[0_24px_70px_rgba(61,36,23,0.06)]"
                  >
                    <h3 className="font-serif text-2xl text-(--brand-ink)">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <ImageSection
          tone="classes"
          minHeight="min-h-[60vh] sm:min-h-[72vh]"
          align="end"
          artwork={<ClassesArtwork />}
        >
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-200">Bookings and learning</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
                Real studios. Real classes. Real ceramic craft.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-stone-100/90 sm:text-lg">
                PotteryMania is designed for studios that teach with confidence. Publish classes, set policies, and keep
                your public presence aligned with your brand.
              </p>
            </div>
            <div className="grid gap-4">
              <TestimonialCard quote={STUDIO_TESTIMONIALS[0].quote} author={testimonialAttribution(STUDIO_TESTIMONIALS[0])} />
              <TestimonialCard quote={STUDIO_TESTIMONIALS[1].quote} author={testimonialAttribution(STUDIO_TESTIMONIALS[1])} />
            </div>
          </div>
        </ImageSection>

        <section className="border-t border-(--brand-line) bg-(--warm-surface)">
          <div className={`${ui.pageContainer} py-10 sm:py-14`}>
            <div className="flex flex-wrap gap-3">
              {trustTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-full border border-(--brand-line) bg-white/80 px-4 py-2 text-sm font-medium text-stone-700"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </section>

        <ImageSection
          tone="texture"
          minHeight="min-h-[54vh] sm:min-h-[64vh]"
          align="center"
          artwork={<TextureArtwork />}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-200">Get started</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              Your studio deserves a calmer setup online.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-100/90 sm:text-lg">
              Create your studio when you are ready. Plans from €19/month, 0% platform commission on checkout sales and
              bookings.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard/studio/new?setup=both" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium text-(--brand-ink) shadow-lg shadow-black/20 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
                Create your studio
              </Link>
              <Link href="/dashboard/studio/new?setup=both" className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
                Set up your site
              </Link>
              <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
                Sign in
              </Link>
            </div>
          </div>
        </ImageSection>
      </main>
    </MarketingLayout>
  );
}

function AnnouncementStrip({ preRegShown }: { preRegShown: number }) {
  const preRegLine = (
    <p className="text-sm text-stone-600 sm:text-right" aria-live="polite">
      <span className="font-semibold tabular-nums text-(--brand-ink)">{preRegShown}</span>
      <span className="tabular-nums text-stone-600"> studios onboarded</span>
    </p>
  );

  return (
    <section className="border-b border-(--brand-line) bg-(--warm-surface)">
      <div className={`${ui.pageContainer} flex flex-col gap-3 py-3 text-sm text-stone-700 sm:flex-row sm:items-start sm:justify-between`}>
        <div className="max-w-xl space-y-1">
          <p className="font-medium text-(--brand-ink)">Built for ceramic studios and makers who sell, teach, and run the business.</p>
          <p className="text-xs leading-relaxed text-stone-600 sm:text-sm">
            Shop and bookings run from your studio dashboard. Start in minutes, grow at your pace.
          </p>
        </div>
        {preRegLine}
      </div>
    </section>
  );
}

function ImageSection({
  children,
  artwork,
  tone,
  minHeight,
  align,
  priority = false,
}: {
  children: React.ReactNode;
  artwork: React.ReactNode;
  tone: "hero" | "studio" | "showcase" | "classes" | "texture";
  minHeight: string;
  align: "bottom" | "center" | "end";
  priority?: boolean;
}) {
  const overlayClass = {
    hero: "from-[#170d09]/85 via-[#2c1810]/48 to-[#4a3228]/14",
    studio: "from-[#120e0b]/84 via-[#21150f]/42 to-[#4b2e21]/15",
    showcase: "from-[#100d0b]/82 via-[#1a1411]/35 to-[#594636]/14",
    classes: "from-[#130f0d]/84 via-[#241b15]/45 to-[#5a4636]/14",
    texture: "from-[#120d0a]/90 via-[#271a14]/48 to-[#6b513d]/18",
  }[tone];

  const justifyClass = align === "bottom" ? "items-end" : align === "end" ? "items-end" : "items-center";
  const paddingClass = align === "bottom" ? "py-20 sm:py-28" : "py-16 sm:py-24";

  return (
    <section className={`relative isolate overflow-hidden ${minHeight}`}>
      <div className="absolute inset-0 min-h-0">{artwork}</div>
      <div className={`absolute inset-0 bg-linear-to-t ${overlayClass}`} aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(255,214,170,0.12),transparent_28%)]" aria-hidden />
      <div className={`relative z-10 mx-auto flex ${minHeight} ${justifyClass} ${ui.pageContainer} ${paddingClass}`}>
        <div className="w-full">{children}</div>
      </div>
      {priority ? <span className="sr-only">{PROMO_LABEL}</span> : null}
    </section>
  );
}

function TestimonialCard({ quote, author }: { quote: string; author: string }) {
  return (
    <article className="rounded-[1.6rem] border border-white/10 bg-white/10 p-5 text-left backdrop-blur-md">
      <p className="text-base leading-7 text-stone-100">“{quote}”</p>
      <p className="mt-4 text-sm font-medium uppercase tracking-[0.16em] text-stone-300">{author}</p>
    </article>
  );
}

function StudioArtwork() {
  return (
    <svg viewBox="0 0 1600 1000" className="h-full w-full object-cover" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="studioBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#e8d7c5" />
          <stop offset="45%" stopColor="#b38869" />
          <stop offset="100%" stopColor="#493225" />
        </linearGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#studioBg)" />
      <rect x="150" y="130" width="1040" height="490" rx="36" fill="#8f6b53" fillOpacity="0.36" />
      {studioShelfPieces.map(({ x, y, w, h, fill }) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width={w} height={14} rx={7} fill="#533829" fillOpacity="0.58" />
          <ellipse cx={x + w / 2} cy={y + h} rx={w / 2} ry={h / 6} fill={fill} />
          <rect x={x + w * 0.2} y={y + h * 0.22} width={w * 0.6} height={h * 0.46} rx={w * 0.18} fill={fill} />
        </g>
      ))}
      <rect x="1180" y="0" width="240" height="1000" fill="#f4e5d7" fillOpacity="0.2" />
      <ellipse cx="1315" cy="305" rx="92" ry="160" fill="#fff6ec" fillOpacity="0.38" />
      <ellipse cx="1280" cy="765" rx="205" ry="115" fill="#2f221b" fillOpacity="0.58" />
    </svg>
  );
}

function ShelfShowcaseArtwork() {
  return (
    <svg viewBox="0 0 1600 950" className="h-full w-full object-cover" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="showcaseBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f1e3d7" />
          <stop offset="40%" stopColor="#c89d78" />
          <stop offset="100%" stopColor="#4b3428" />
        </linearGradient>
      </defs>
      <rect width="1600" height="950" fill="url(#showcaseBg)" />
      <ellipse cx="430" cy="735" rx="250" ry="88" fill="#f6ede3" fillOpacity="0.68" />
      <ellipse cx="1160" cy="735" rx="250" ry="88" fill="#f6ede3" fillOpacity="0.62" />
      <ellipse cx="430" cy="640" rx="130" ry="170" fill="#d8b393" />
      <ellipse cx="430" cy="606" rx="95" ry="140" fill="#b7794f" />
      <ellipse cx="430" cy="586" rx="55" ry="55" fill="#efe3d5" />
      <ellipse cx="1160" cy="630" rx="160" ry="182" fill="#ead6c1" />
      <ellipse cx="1160" cy="598" rx="112" ry="144" fill="#c49370" />
      <ellipse cx="1160" cy="575" rx="63" ry="58" fill="#fff1df" />
      <rect x="640" y="214" width="320" height="430" rx="40" fill="#f8efe6" fillOpacity="0.2" />
      <path d="M800 312c76 0 137 42 137 95 0 52-61 95-137 95s-137-43-137-95c0-53 61-95 137-95Z" fill="#f7eadc" fillOpacity="0.42" />
      <rect x="738" y="384" width="124" height="172" rx="56" fill="#8a593d" fillOpacity="0.76" />
      <ellipse cx="800" cy="554" rx="82" ry="34" fill="#d7b091" fillOpacity="0.65" />
    </svg>
  );
}

function ClassesArtwork() {
  return (
    <svg viewBox="0 0 1600 980" className="h-full w-full object-cover" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="classesBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#ecdcca" />
          <stop offset="46%" stopColor="#b98969" />
          <stop offset="100%" stopColor="#473126" />
        </linearGradient>
      </defs>
      <rect width="1600" height="980" fill="url(#classesBg)" />
      <ellipse cx="380" cy="588" rx="110" ry="170" fill="#8c5d42" fillOpacity="0.88" />
      <circle cx="380" cy="386" r="66" fill="#e1bc9c" fillOpacity="0.86" />
      <ellipse cx="750" cy="598" rx="118" ry="176" fill="#6a4838" fillOpacity="0.9" />
      <circle cx="752" cy="392" r="70" fill="#d7af8a" fillOpacity="0.88" />
      <ellipse cx="1110" cy="598" rx="110" ry="168" fill="#9b6b50" fillOpacity="0.88" />
      <circle cx="1112" cy="388" r="68" fill="#e4c2a2" fillOpacity="0.86" />
      <ellipse cx="380" cy="748" rx="152" ry="74" fill="#2f211a" fillOpacity="0.44" />
      <ellipse cx="752" cy="748" rx="164" ry="74" fill="#2f211a" fillOpacity="0.44" />
      <ellipse cx="1112" cy="748" rx="152" ry="74" fill="#2f211a" fillOpacity="0.44" />
      <path d="M320 660c38-55 82-82 131-82 49 0 89 21 121 64-58-12-113-9-167 6-32 8-61 14-85 12Z" fill="#ceb49d" fillOpacity="0.8" />
      <path d="M688 668c35-52 81-78 129-78 48 0 86 18 117 58-54-10-107-7-159 7-31 8-59 14-87 13Z" fill="#dac3ad" fillOpacity="0.76" />
      <path d="M1048 666c34-48 76-73 121-73 46 0 84 18 112 54-49-8-99-5-146 10-29 8-57 13-87 9Z" fill="#e0c7b1" fillOpacity="0.76" />
    </svg>
  );
}

function TextureArtwork() {
  return (
    <svg viewBox="0 0 1600 900" className="h-full w-full object-cover" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="textureBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#e6cfbb" />
          <stop offset="45%" stopColor="#9f6f54" />
          <stop offset="100%" stopColor="#2e1f18" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#textureBg)" />
      {[
        "M0 186C110 148 208 149 316 185s217 56 338 37c145-23 214-90 338-94 101-3 205 36 314 76 94 35 186 49 294 36v77H0Z",
        "M0 401c149-54 277-56 423-5 172 60 249 93 383 72 132-22 210-83 350-90 138-7 242 42 444 129v86H0Z",
        "M0 656c119-46 236-50 375-13 157 42 270 106 415 109 135 3 232-54 334-85 158-48 302-31 476 58v175H0Z",
      ].map((d, index) => (
        <path
          key={d}
          d={d}
          fill={index === 0 ? "#f5e7da" : index === 1 ? "#c69471" : "#704a37"}
          fillOpacity={index === 2 ? 0.62 : 0.4}
        />
      ))}
      {[
        [210, 210, 65],
        [394, 312, 48],
        [626, 248, 76],
        [880, 330, 58],
        [1112, 248, 82],
        [1378, 334, 60],
      ].map(([cx, cy, r]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} fill="#fff8ef" fillOpacity="0.08" />
      ))}
    </svg>
  );
}
