import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { MarketingLayout } from "@/components/marketing-layout";
import { MobileLandingHero } from "@/components/marketing/mobile-landing-hero";
import { buildMetadata } from "@/lib/seo";
import { organizationJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/structured-data";
import { ui } from "@/lib/ui-styles";
import { formatWearMarginPercentFromBps, resolveWearGlobalPricing } from "@/lib/wear-commission";

export const dynamic = "force-dynamic";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "Sell your work. Run your studio. Own your craft. | PotteryMania",
    description:
      "Built for potters, ceramic artists, and teachers. Sell your work, take class bookings, and run everything from one place.",
    path: "/",
  });
  return {
    ...base,
    other: {
      "impact-site-verification": IMPACT_SITE_VERIFICATION,
    },
  };
}

type LandingPanelKey = "shop" | "bookings" | "wearables" | "marketplace_free";

type LandingPanel = {
  key: LandingPanelKey;
  title: string;
  subtitle: string;
  points: readonly [string, string, string, string];
  psychologicalLine?: string;
  cta: string;
  href: string;
  image: string;
  alt: string;
  /** Teaser card — shows “Coming soon” ribbon and softer CTA styling */
  comingSoon?: boolean;
};

/**
 * Eyebrow labels shown above each hero panel title.
 * IMPORTANT: `marketplace_free` must NOT use "Discover creators" or similar —
 * AGENTS.md forbids positioning the product as a marketplace / discovery platform.
 */
const LANDING_EYEBROWS: Record<LandingPanelKey, string> = {
  shop: "Sell your work",
  bookings: "Book your classes",
  wearables: "Expand your brand",
  marketplace_free: "Public catalog",
};

function buildLandingPanels(defaultResellerMarginLabel: string): LandingPanel[] {
  return [
  {
    key: "shop",
    title: "Open your own pottery shop",
    subtitle: "Sell your ceramics. Solo maker or full studio.",
    points: [
      "Start with one piece or a full collection",
      "Sell straight to your customers",
      "Set your own prices",
      "Get paid fast",
    ],
    cta: "Start selling",
    href: "/register?callbackUrl=%2Fdashboard%2Fstudio%2Fnew%3Fsetup%3Dshop",
    image:
      "https://images.unsplash.com/photo-1610701596061-2ecf227e85b2?auto=format&fit=crop&w=1600&q=80",
    alt: "Handmade ceramic tableware arranged for a studio shop collection",
  },
  {
    key: "bookings",
    title: "Take class bookings online",
    subtitle: "Turn your space or your skills into bookable classes.",
    points: [
      "Offer classes or private sessions",
      "Take bookings 24/7",
      "Set your schedule and prices",
      "Customers pay when they book",
    ],
    cta: "Start booking",
    href: "/register?callbackUrl=%2Fdashboard%2Fstudio%2Fnew%3Fsetup%3Dbookings",
    image:
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1600&q=80",
    alt: "Hands shaping clay during a pottery workshop session",
  },
  {
    key: "wearables",
    title: "Add branded wearables",
    subtitle: "Sell apparel with your studio name. No stock, no risk.",
    psychologicalLine: `Print-on-demand. Default reseller margin ${defaultResellerMarginLabel}.`,
    points: [
      "Branded apparel for your studio",
      "No stock to hold",
      "Printed and shipped for you",
      "Earn on every sale",
    ],
    cta: "Shop wearables",
    href: "/wear",
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1600&q=80",
    alt: "Minimal studio apparel for a pottery brand collection",
  },
  {
    key: "marketplace_free",
    title: "Free public catalog",
    subtitle: "Browse studios and ceramics in one place. Free for everyone.",
    psychologicalLine: "Coming soon.",
    points: [
      "Find makers near you",
      "Built for ceramics",
      "You stay in charge of your customers",
      "No listing fees",
    ],
    cta: "See the catalog",
    href: "/marketplace",
    image:
      "https://images.unsplash.com/photo-1578662996442-48f60103fc96?auto=format&fit=crop&w=1600&q=80",
    alt: "Ceramic pieces and studio shelves suggesting a browsable catalog",
    comingSoon: true,
  },
];
}

export default async function Home() {
  const pricing = await resolveWearGlobalPricing();
  const defaultResellerMarginLabel = formatWearMarginPercentFromBps(pricing.defaultMarginBps);
  const landingPanels = buildLandingPanels(defaultResellerMarginLabel);
  const jsonLd = toJsonLdScript([websiteJsonLd(), organizationJsonLd()]);
  return (
    <MarketingLayout>
      <main className="bg-[#f6f1e8] text-[#1f1a17]">
        <section className={`${ui.pageContainer} py-6 sm:py-10`}>
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl leading-[1.02] tracking-[-0.02em] text-stone-950 sm:text-5xl">
              Sell your work. Run your studio. Own your craft.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-stone-700 sm:text-base">
              Built for potters, ceramic artists, and teachers. Start with one piece — grow into a full studio.
            </p>
            <p className="mt-2 max-w-2xl text-xs text-stone-600 sm:text-sm">
              Connect your own domain in minutes.
            </p>
          </div>
        </section>

        <section className={`${ui.pageContainer} pb-6 sm:pb-8`}>
          <div className="hidden h-[calc(100svh-15.5rem)] min-h-[560px] grid-cols-2 gap-4 md:grid md:min-h-[620px] xl:grid-cols-4">
            {landingPanels.map((panel) => (
              <LandingHeroPanel key={panel.key} panel={panel} />
            ))}
          </div>

          <div className="md:hidden">
            <MobileLandingHero panels={landingPanels} />
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}

function LandingHeroPanel({ panel, compact = false }: { panel: LandingPanel; compact?: boolean }) {
  const comingSoon = panel.comingSoon === true;
  return (
    <article
      className={`relative isolate h-full overflow-hidden rounded-(--radius-card) border bg-[#ebe3d8] ${
        comingSoon ? "border-amber-400/50 ring-1 ring-amber-300/35 shadow-[0_0_0_1px_rgba(251,191,36,0.12)]" : "border-stone-300"
      }`}
    >
      {comingSoon ? (
        <div className="absolute right-3 top-3 z-20 rounded-full border border-amber-300/80 bg-amber-950/90 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-100 shadow-sm backdrop-blur-sm">
          Coming soon
        </div>
      ) : null}
      <Image
        src={panel.image}
        alt={panel.alt}
        fill
        priority={!compact && panel.key === "shop"}
        fetchPriority={!compact && panel.key === "shop" ? "high" : undefined}
        sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 50vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-black/75" aria-hidden />
      <div className={`relative z-10 flex h-full flex-col ${compact ? "p-4" : "p-6 lg:p-7"}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-200">{LANDING_EYEBROWS[panel.key]}</p>
        <h2 className={`mt-2 font-serif tracking-[-0.015em] text-white ${compact ? "text-2xl leading-tight" : "text-3xl leading-tight"}`}>
          {panel.key === "marketplace_free" ? (
            <>
              <span className="block text-white">Free</span>
              <span className="block text-[#f4d5af]">public catalog</span>
            </>
          ) : (
            panel.title
          )}
        </h2>
        <p className={`mt-2 text-white/90 ${compact ? "text-xs leading-relaxed" : "text-sm leading-relaxed"}`}>{panel.subtitle}</p>
        {panel.psychologicalLine ? (
          <p className={`mt-2 font-medium text-[#f4d5af] ${compact ? "text-[11px]" : "text-sm"}`}>
            {panel.psychologicalLine}
          </p>
        ) : null}
        <ul className={`mt-4 space-y-1.5 ${compact ? "text-[11px]" : "text-sm"} text-white/85`}>
          {panel.points.map((point) => (
            <li key={point} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f4d5af]" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        <Link
          href={panel.href}
          className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-(--radius-button) px-5 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${
            comingSoon
              ? "border border-white/25 bg-white/10 text-white backdrop-blur-sm hover:bg-white/15 focus-visible:outline-white/40"
              : "bg-[#f6ebde] text-stone-950 hover:bg-white focus-visible:outline-[#f6ebde]"
          }`}
        >
          {panel.cta}
        </Link>
      </div>
    </article>
  );
}
