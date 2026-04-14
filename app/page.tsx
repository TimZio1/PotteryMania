import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { MarketingLayout } from "@/components/marketing-layout";
import { prisma } from "@/lib/db";
import { PROMO_LABEL } from "@/lib/promo";
import { ClarityCardsStagger } from "@/components/marketing/clarity-cards-stagger";
import { FeaturedStudiosRail } from "@/components/marketing/featured-studios-rail";
import { HeroPhotography } from "@/components/marketing/hero-photography";
import { getFeaturedStudiosForSlot } from "@/lib/featured-studios-public";
import { displayedPreRegTotal } from "@/lib/brand";
import { EARLY_ACCESS_PROOF } from "@/lib/marketing-testimonials";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";
import { monthlyLabel, STUDIO_PLANS } from "@/lib/studio-plan-pricing";
import { MARKETING_HERO_PRIMARY } from "@/lib/marketing-hero-variants";

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
      "Sell your work, book your classes, and run your studio in one place. Free until 1 May 2026 with no payment required, then plans from €19/month.",
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
    body: "A dark, gallery-style presentation that respects handmade work and feels worth belonging to.",
  },
];

const visitorPaths = [
  {
    title: "I run a studio",
    body: "Set up your studio with bookings, shop, or both.",
    href: "/demo",
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
          <p className="inline-flex rounded-full border border-white/20 bg-white/8 px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/90 backdrop-blur-md">
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
            Free until 1 May 2026. No credit card required. Plans from €19/month after launch.{" "}
            <span className="text-white/90">0% platform commission</span> on checkout sales and bookings.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65 sm:max-w-2xl">
            Replaces the patchwork of DMs, spreadsheets, and generic site builders — without giving up your brand.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link href="/demo" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] px-8 py-3 text-sm font-medium text-[var(--accent-contrast)] shadow-[0_4px_24px_rgba(0,0,0,0.3)] transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
              {MARKETING_HERO_PRIMARY.ctaPrimary}
            </Link>
            <Link href="#clarity" className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-button)] border border-white/35 bg-transparent px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              {MARKETING_HERO_PRIMARY.ctaSecondary}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-12 items-center justify-center rounded-[var(--radius-button)] border border-white/25 px-8 py-3 text-sm font-medium text-white/95 backdrop-blur-sm transition hover:border-white/40 hover:bg-white/6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              See plans
            </Link>
          </div>
        </ImageSection>

        <section className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className={`${ui.pageContainer} py-14 sm:py-20`}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Money on the table</p>
              <h2 className="mt-5 font-serif text-3xl font-normal leading-[1.12] tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl">
                This is what&apos;s costing you money
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                If any of this sounds familiar, you are leaving bookings and sales on the table every week.
              </p>
            </div>
            <ul className="mt-12 grid gap-3 sm:grid-cols-2 sm:gap-4">
              {[
                "Customers message you instead of completing real bookings",
                "Deposits and balances slip through — no reliable payment flow",
                "No single structure: calendars, inventory, and DMs don't talk to each other",
                "No real system — so growth feels like more chaos, not more revenue",
              ].map((line) => (
                <li
                  key={line}
                  className="flex gap-3.5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-elevated)] px-5 py-4 text-sm leading-relaxed text-[var(--foreground)] sm:text-base"
                >
                  <span className="mt-0.5 shrink-0 font-medium text-[var(--muted)]" aria-hidden>
                    —
                  </span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <div className="mt-12 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className={ui.buttonPrimary}
              >
                Create your studio
              </Link>
              <Link
                href="/pricing"
                className={ui.buttonSecondary}
              >
                See plans
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)] bg-[var(--background)]">
          <div className={`${ui.pageContainer} py-14 sm:py-16`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">{EARLY_ACCESS_PROOF.eyebrow}</p>
            <h2 className="mt-4 max-w-xl font-serif text-2xl font-normal leading-tight tracking-[-0.02em] text-[var(--foreground)] sm:text-3xl">
              {EARLY_ACCESS_PROOF.headline}
            </h2>
            <div className="mt-6 max-w-3xl rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--pm-shadow-rest)] sm:p-8">
              <p className="text-base leading-relaxed text-[var(--muted)]">{EARLY_ACCESS_PROOF.body}</p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                {EARLY_ACCESS_PROOF.bullets.map((line) => (
                  <li key={line} className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-3 text-sm leading-6 text-[var(--foreground)]">
                    {line}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                <p className="text-sm font-semibold text-[var(--accent)]">
                  {displayedPreRegTotal(preRegCount)} studios joined early access.
                </p>
                <Link href={EARLY_ACCESS_PROOF.ctaHref} className={ui.buttonPrimary}>
                  {EARLY_ACCESS_PROOF.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        <FeaturedStudiosRail studios={featuredStudios} />

        <section className="border-b border-[var(--border)] bg-[var(--background)]">
          <div className={`${ui.pageContainer} py-14 sm:py-20`}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Start in one click</p>
              <h2 className="mt-4 font-serif text-3xl font-normal leading-[1.12] tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl">
                Choose your path on PotteryMania.
              </h2>
            </div>
            <div className="mt-10 grid gap-5 lg:grid-cols-3">
              {visitorPaths.map((path) => (
                <article
                  key={path.title}
                  className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--pm-shadow-rest)]"
                >
                  <h3 className="font-serif text-xl font-normal tracking-[-0.01em] text-[var(--foreground)] sm:text-2xl">
                    {path.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">{path.body}</p>
                  <Link
                    href={path.href}
                    className="mt-6 inline-flex text-sm font-medium text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4 hover:decoration-[var(--accent)]/60"
                  >
                    {path.cta}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-b border-[var(--border)] bg-[var(--surface)]">
          <div className={`${ui.pageContainer} py-12 sm:py-14`}>
            <div className="flex flex-col gap-6 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-elevated)] p-7 shadow-[var(--pm-shadow-rest)] sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">Pricing model</p>
                <p className="mt-3 text-sm leading-relaxed text-[var(--muted)] sm:text-base">
                  Pay by studio usage: bookings-only, shop-only, both, or pro. Platform commission stays at 0%.
                </p>
                <p className="mt-3 text-sm font-medium text-[var(--accent)]">Free until 1 May 2026. No payment required.</p>
                <Link
                  href="/pricing"
                  className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4 transition hover:decoration-[var(--accent)]/60"
                >
                  Full comparison &rarr;
                </Link>
              </div>
              <ul className="flex flex-wrap gap-2">
                {STUDIO_PLANS.map((plan) => (
                  <li
                    key={plan.key}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--muted)]"
                  >
                    {plan.name} &middot; {monthlyLabel(plan)}
                    {plan.recommended ? " · Most popular" : ""}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section id="clarity" className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className={`${ui.pageContainer} py-20 sm:py-24`}>
            <div className="max-w-2xl">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[var(--muted)]">What PotteryMania is</p>
              <h2 className="mt-5 font-serif text-3xl font-normal leading-[1.12] tracking-[-0.02em] text-[var(--foreground)] sm:text-4xl">
                A clearer, more beautiful digital home for independent ceramics.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--muted)] sm:text-lg">
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
          <div className="max-w-2xl rounded-[var(--radius-card)] border border-white/10 bg-black/20 p-6 backdrop-blur-[2px] sm:p-8">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">For studio owners</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
              Everything a ceramic studio needs, gathered into one calm, credible place.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
              PotteryMania helps you present the work beautifully, publish experiences confidently, and look established
              from the first visit.
            </p>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {studioBenefits.map((benefit) => (
                <li key={benefit} className="flex items-start gap-3 text-sm leading-6 text-white/90 sm:text-base">
                  <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/20 text-xs text-[var(--accent)]">
                    &#10003;
                  </span>
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
            <Link href="/demo" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] px-7 py-3 text-sm font-medium text-[var(--accent-contrast)] shadow-lg shadow-black/30 transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]">
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
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Studio-owned shop</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
              Your shop lives on your studio page — your brand, your products.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
              Keep a strong voice, present handmade work with care, and manage products from one dashboard.
            </p>
          </div>
        </ImageSection>

        <section className="border-y border-[var(--border)] bg-[var(--surface)]">
          <div className={`${ui.pageContainer} py-16 sm:py-24`}>
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Why it feels different</p>
                <h2 className="mt-4 font-serif text-3xl leading-tight text-[var(--foreground)] sm:text-4xl">
                  PotteryMania is not trying to be everything. That is exactly why it can be right for ceramics.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-[var(--muted)] sm:text-lg">
                  The platform is focused on real studio operations: website, bookings, products, trust, and consistent
                  branding for ceramic businesses.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {differentiators.map((item) => (
                  <article
                    key={item.title}
                    className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-[var(--pm-shadow-rest)]"
                  >
                    <h3 className="font-serif text-2xl text-[var(--foreground)]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--muted)] sm:text-base">{item.body}</p>
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
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Bookings and learning</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
                Real studios. Real classes. Real ceramic craft.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-white/90 sm:text-lg">
                PotteryMania is designed for studios that teach with confidence. Publish classes, set policies, and keep
                your public presence aligned with your brand.
              </p>
            </div>
            <div className="grid gap-4">
              {EARLY_ACCESS_PROOF.bullets.map((line) => (
                <article key={line} className="rounded-[var(--radius-card)] border border-white/10 bg-white/10 p-5 text-left backdrop-blur-md">
                  <p className="text-base leading-7 text-white/90">{line}</p>
                </article>
              ))}
            </div>
          </div>
        </ImageSection>

        <ImageSection
          tone="texture"
          minHeight="min-h-[54vh] sm:min-h-[64vh]"
          align="center"
          artwork={<TextureArtwork />}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-[var(--muted)]">Get started</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              Your studio deserves a calmer setup online.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-white/90 sm:text-lg">
              Create your studio when you are ready. Free until 1 May 2026, then plans from €19/month with 0% platform
              commission on checkout sales and bookings.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/demo" className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-button)] bg-[var(--accent)] px-7 py-3 text-sm font-medium text-[var(--accent-contrast)] shadow-lg shadow-black/30 transition hover:bg-[var(--accent-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-auto">
                Create your studio
              </Link>
              <Link href="/pricing" className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-button)] border border-white/25 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
                See plans
              </Link>
              <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center rounded-[var(--radius-button)] border border-white/25 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
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
    <p className="text-sm text-[var(--muted)] sm:text-right" aria-live="polite">
      <span className="font-semibold tabular-nums text-[var(--foreground)]">{preRegShown}</span>
      <span className="tabular-nums text-[var(--muted)]"> studios joined early access</span>
    </p>
  );

  return (
    <section className="border-b border-[var(--border)] bg-[var(--surface)]">
      <div className={`${ui.pageContainer} flex flex-col gap-3 py-3 text-sm text-[var(--muted)] sm:flex-row sm:items-start sm:justify-between`}>
        <div className="max-w-xl space-y-1">
          <p className="font-medium text-[var(--foreground)]">Built for ceramic studios and makers who sell, teach, and run the business.</p>
          <p className="text-xs leading-relaxed text-[var(--muted)] sm:text-sm">
            Build your studio site, launch classes, and start selling in one calm system.
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
    hero: "from-[#0A0A0A]/90 via-[#0E0E0E]/55 to-[#161616]/20",
    studio: "from-[#0A0A0A]/88 via-[#0E0E0E]/50 to-[#161616]/18",
    showcase: "from-[#0A0A0A]/85 via-[#0E0E0E]/45 to-[#1C1C1C]/16",
    classes: "from-[#0A0A0A]/88 via-[#0E0E0E]/50 to-[#161616]/18",
    texture: "from-[#0A0A0A]/92 via-[#0E0E0E]/55 to-[#161616]/22",
  }[tone];

  const justifyClass = align === "bottom" ? "items-end" : align === "end" ? "items-end" : "items-center";
  const paddingClass = align === "bottom" ? "py-20 sm:py-28" : "py-16 sm:py-24";

  return (
    <section className={`relative isolate overflow-hidden ${minHeight}`}>
      <div className="absolute inset-0 min-h-0">{artwork}</div>
      <div className={`absolute inset-0 bg-linear-to-t ${overlayClass}`} aria-hidden />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(196,122,44,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(196,122,44,0.06),transparent_28%)]" aria-hidden />
      <div className={`relative z-10 mx-auto flex ${minHeight} ${justifyClass} ${ui.pageContainer} ${paddingClass}`}>
        <div className="w-full">{children}</div>
      </div>
      {priority ? <span className="sr-only">{PROMO_LABEL}</span> : null}
    </section>
  );
}

function StudioArtwork() {
  return (
    <Image
      src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=2400&q=85"
      alt="Ceramic pieces arranged on studio shelving"
      fill
      className="object-cover object-center"
      sizes="100vw"
    />
  );
}

function ShelfShowcaseArtwork() {
  return (
    <Image
      src="https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=2400&q=85"
      alt="Handmade stoneware bowls and serving pieces"
      fill
      className="object-cover object-center"
      sizes="100vw"
    />
  );
}

function ClassesArtwork() {
  return (
    <Image
      src="https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=2400&q=85"
      alt="Pottery workshop students shaping clay together"
      fill
      className="object-cover object-center"
      sizes="100vw"
    />
  );
}

function TextureArtwork() {
  return (
    <Image
      src="https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=2400&q=85"
      alt="Studio table with handmade ceramics and warm natural light"
      fill
      className="object-cover object-center"
      sizes="100vw"
    />
  );
}
