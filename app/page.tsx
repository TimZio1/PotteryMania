import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { MarketingLayout } from "@/components/marketing-layout";
import { MobileLandingHero } from "@/components/marketing/mobile-landing-hero";
import { buildMetadata } from "@/lib/seo";
import { organizationJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/structured-data";
import { ui } from "@/lib/ui-styles";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "Sell your work. Run your studio. Own your craft. | PotteryMania",
    description:
      "Built for potters, ceramic artists, teachers, and studios. Sell your work, run bookings, and grow from your first piece to your full studio.",
    path: "/",
  });
  return {
    ...base,
    other: {
      "impact-site-verification": IMPACT_SITE_VERIFICATION,
    },
  };
}

type LandingPanel = {
  key: "shop" | "bookings" | "wearables";
  title: string;
  subtitle: string;
  points: readonly [string, string, string, string];
  psychologicalLine?: string;
  cta: string;
  href: string;
  image: string;
  alt: string;
};

const landingPanels: LandingPanel[] = [
  {
    key: "shop",
    title: "Create Your Own Pottery Shop",
    subtitle: "Sell your ceramics - whether you're a solo artist or a full studio.",
    points: [
      "Start with one piece or a full collection",
      "Sell directly to your audience",
      "Set your own prices",
      "Get paid instantly",
    ],
    psychologicalLine: "From your first piece to a full collection.",
    cta: "Create Your Shop",
    href: "/register?callbackUrl=%2Fdashboard%2Fstudio%2Fnew%3Fsetup%3Dshop",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1600&q=80",
    alt: "Minimal ceramic product styling on neutral backdrop",
  },
  {
    key: "bookings",
    title: "Create Your Booking Site",
    subtitle: "Turn your space - or your skills - into bookable experiences.",
    points: [
      "Offer classes or private sessions",
      "Accept bookings 24/7",
      "Manage availability easily",
      "Get confirmed instantly",
    ],
    cta: "Start Taking Bookings",
    href: "/register?callbackUrl=%2Fdashboard%2Fstudio%2Fnew%3Fsetup%3Dbookings",
    image:
      "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1600&q=80",
    alt: "Pottery studio class with hands shaping clay",
  },
  {
    key: "wearables",
    title: "Shop Wearables",
    subtitle: "Turn your craft into something people can wear.",
    points: ["Sell branded apparel", "No inventory required", "Print-on-demand fulfillment", "Expand your identity beyond clay"],
    cta: "Explore Wearables",
    href: "/wear/shop",
    image:
      "https://images.unsplash.com/photo-1503341338985-db53aad2eeaa?auto=format&fit=crop&w=1600&q=80",
    alt: "Minimal black and white apparel styled in editorial lighting",
  },
];

export default function Home() {
  const jsonLd = toJsonLdScript([websiteJsonLd(), organizationJsonLd()]);
  return (
    <MarketingLayout>
      <main className="bg-[#f6f1e8] text-[#1f1a17]">
        <section className="border-b border-stone-200 bg-[#f9f5ed]">
          <div className={`${ui.pageContainer} flex items-center justify-between py-3`}>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-600">PotteryMania for people who make with clay</p>
            <Link href="/demo" className="inline-flex min-h-10 items-center text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-900 underline decoration-stone-400 underline-offset-4 hover:decoration-stone-700">
              Start now
            </Link>
          </div>
        </section>

        <section className={`${ui.pageContainer} py-6 sm:py-8`}>
          <div className="max-w-3xl">
            <h1 className="font-serif text-3xl leading-[1.02] tracking-[-0.02em] text-stone-950 sm:text-5xl">
              Sell your work. Run your studio. Own your craft.
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-stone-700 sm:text-base">
              Built for potters, ceramic artists, and studios.
            </p>
            <p className="mt-2 text-sm font-medium text-stone-900">Your craft, your business. Start small, grow into a studio.</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-stone-600">
              From your first piece... to your full studio.
            </p>
          </div>
        </section>

        <section className={`${ui.pageContainer} pb-6 sm:pb-8`}>
          <div className="hidden h-[calc(100svh-15.5rem)] min-h-[620px] grid-cols-3 gap-4 md:grid">
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
  return (
    <article className={`relative isolate h-full overflow-hidden rounded-(--radius-card) border border-stone-300 bg-[#ebe3d8]`}>
      <Image
        src={panel.image}
        alt={panel.alt}
        fill
        priority={!compact && panel.key === "shop"}
        fetchPriority={!compact && panel.key === "shop" ? "high" : undefined}
        sizes="(min-width: 768px) 33vw, 100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/55 to-black/75" aria-hidden />
      <div className={`relative z-10 flex h-full flex-col ${compact ? "p-4" : "p-6 lg:p-7"}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-200">
          {panel.key === "shop" ? "Sell your work" : panel.key === "bookings" ? "Book your skills" : "Expand your brand"}
        </p>
        <h2 className={`mt-2 font-serif tracking-[-0.015em] text-white ${compact ? "text-2xl leading-tight" : "text-3xl leading-tight"}`}>
          {panel.title}
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
          className="mt-auto inline-flex min-h-12 items-center justify-center rounded-(--radius-button) bg-[#f6ebde] px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#f6ebde]"
        >
          {panel.cta}
        </Link>
      </div>
    </article>
  );
}
