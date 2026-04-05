import Link from "next/link";
import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { PromoCountdown } from "@/components/promo-countdown";
import { getMarketingCheckoutCommissionPctLabel } from "@/lib/commission";
import { EUROPEAN_PREREGISTRATION_NOTE } from "@/lib/european-preregistration";
import { isPromoActive, PROMO_LABEL } from "@/lib/promo";
import { isPreregistrationOnly } from "@/lib/preregistration";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const commissionLabel = await getMarketingCheckoutCommissionPctLabel();
  return buildMetadata({
    title: "Ceramics marketplace and classes",
    description: `Where ceramic studios sell, teach, and get discovered. ${commissionLabel} platform commission on checkout sales. Pre-register for 3 months free, then EUR5/month.`,
    path: "/",
  });
}

const clarityItems = [
  {
    title: "Sell ceramics",
    body: "Present your handmade work in a marketplace designed for craft, not mass-produced noise.",
  },
  {
    title: "Fill your classes",
    body: "Publish workshops, open sessions, and courses with booking and payment built in.",
  },
  {
    title: "Get discovered",
    body: "Join a curated ceramics ecosystem where collectors and students come looking with intent.",
  },
];

const differentiators = [
  {
    title: "Ceramics only",
    body: "Every detail is shaped around clay, glaze, workshops, and the way real studios work.",
  },
  {
    title: "Studio-first",
    body: "Not a generic storefront. PotteryMania is built for makers who sell, teach, and grow a reputation.",
  },
  {
    title: "Products and classes",
    body: "Bring together objects, experiences, and discovery in one elegant public presence.",
  },
  {
    title: "Premium presentation",
    body: "A warmer, more curated environment that respects handmade work and feels worth belonging to.",
  },
];

const trustTags = ["Stoneware", "Porcelain", "Workshops", "Wheel Throwing", "Raku", "Studio Shelf", "Glaze", "Handbuilt"];

const studioShelfPieces = [
  { x: 220, y: 205, w: 110, h: 140, fill: "#dfc0a3" },
  { x: 370, y: 205, w: 88, h: 120, fill: "#b1774f" },
  { x: 500, y: 202, w: 120, h: 160, fill: "#efdecc" },
  { x: 660, y: 198, w: 92, h: 126, fill: "#c99772" },
  { x: 800, y: 210, w: 125, h: 135, fill: "#e7cfb5" },
  { x: 960, y: 202, w: 88, h: 152, fill: "#b88263" },
];

export default async function Home() {
  const commissionLabel = await getMarketingCheckoutCommissionPctLabel();
  const studioBenefits = [
    "List products with gallery-quality presentation",
    "Publish workshops and accept bookings online",
    `Pay ${commissionLabel} platform commission on sales through checkout — no listing fees`,
    "Receive direct Stripe payouts without admin friction",
    "Build a studio profile that earns trust over time",
    "Reach new collectors and students through one destination",
  ];

  return (
    <MarketingLayout>
      <main className="overflow-hidden">
        <AnnouncementStrip />

        <ImageSection
          tone="hero"
          minHeight="min-h-[84vh] sm:min-h-[90vh]"
          align="bottom"
          artwork={<HeroArtwork />}
          priority
        >
          <p className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-stone-100 backdrop-blur-sm">
            Ceramics marketplace and studio platform
          </p>
          <h1 className="mt-6 max-w-4xl font-serif text-5xl leading-[0.94] tracking-tight text-white sm:text-6xl lg:text-7xl">
            Where ceramic studios sell, teach, and get discovered.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-stone-100/90 sm:text-lg sm:leading-8">
            A premium home for independent makers. List your work, fill your classes, shape your studio presence, and
            join a curated ceramics ecosystem that feels as refined as the craft itself.
          </p>
          <p className="mt-4 max-w-2xl text-sm font-medium text-stone-100/85">{EUROPEAN_PREREGISTRATION_NOTE}</p>
          <div className="mt-6 flex max-w-xl flex-col gap-2">
            <div className="inline-flex max-w-fit rounded-full border border-emerald-300/30 bg-emerald-50/10 px-4 py-2 text-sm font-medium text-emerald-50 backdrop-blur-sm">
              Pre-register and earn 3 months free, then EUR5/month.
            </div>
            <p className="text-sm text-stone-100/80">
              {commissionLabel} commission on marketplace and class checkout — only when you get paid.
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href="/early-access" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium text-(--brand-ink) shadow-lg shadow-black/20 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Register your studio
            </Link>
            <Link href="#clarity" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              How it works
            </Link>
          </div>
        </ImageSection>

        <section id="clarity" className="border-y border-(--brand-line) bg-(--warm-surface)">
          <div className={`${ui.pageContainer} py-18 sm:py-24`}>
            <div className="max-w-2xl">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">What PotteryMania is</p>
              <h2 className="mt-4 font-serif text-3xl leading-tight text-(--brand-ink) sm:text-4xl">
                A clearer, more beautiful digital home for independent ceramics.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                PotteryMania brings together selling, booking, and visibility so studios can grow with less patchwork and
                more presence.
              </p>
            </div>
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {clarityItems.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-(--brand-line) bg-white/80 p-7 shadow-[0_20px_60px_rgba(61,36,23,0.06)] backdrop-blur-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-(--brand-soft) text-sm font-semibold text-(--brand-ink)">
                    0{index + 1}
                  </div>
                  <h3 className="mt-5 font-serif text-2xl text-(--brand-ink)">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-stone-600 sm:text-base">{item.body}</p>
                </article>
              ))}
            </div>
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
            <Link href="/early-access" className="mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium text-(--brand-ink) shadow-lg shadow-black/20 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
              Join early access
            </Link>
          </div>
        </ImageSection>

        <ImageSection
          tone="marketplace"
          minHeight="min-h-[58vh] sm:min-h-[68vh]"
          align="center"
          artwork={<MarketplaceArtwork />}
        >
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-200">Marketplace</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
              A ceramics marketplace that feels closer to a gallery than a generic listing site.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-100/90 sm:text-lg">
              Curated, tactile, and visually considered. Every piece belongs to an independent studio or maker, so the
              handmade value is obvious from the first glance.
            </p>
          </div>
        </ImageSection>

        <section className="border-y border-(--brand-line) bg-(--brand-soft)">
          <div className={`${ui.pageContainer} py-18 sm:py-24`}>
            <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-500">Why it feels different</p>
                <h2 className="mt-4 font-serif text-3xl leading-tight text-(--brand-ink) sm:text-4xl">
                  PotteryMania is not trying to be everything. That is exactly why it can be right for ceramics.
                </h2>
                <p className="mt-4 max-w-xl text-base leading-7 text-stone-600 sm:text-lg">
                  The platform is focused on the needs of real ceramic studios: products, classes, trust, and visibility,
                  all expressed with a warmer editorial sensibility.
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
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-200">Community and discovery</p>
              <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl">
                Real studios. Real classes. Real craft.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-7 text-stone-100/90 sm:text-lg">
                PotteryMania is designed for people who care about making and learning. It brings together collectors,
                students, and studios in a more focused cultural space.
              </p>
            </div>
            <div className="grid gap-4">
              <TestimonialCard
                quote="Finally, a platform that understands pottery is not just ecommerce. It is also atmosphere, teaching, and trust."
                author="Studio owner, Athens"
              />
              <TestimonialCard
                quote="I have been piecing together classes across calendars, messages, and spreadsheets. This feels far more serious."
                author="Workshop instructor, Barcelona"
              />
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
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-stone-200">Early access</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
              Your studio deserves a better home online.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-stone-100/90 sm:text-lg">
              Join PotteryMania during early access. Register now, secure 3 months free, then continue for EUR5/month
              as the platform opens to the public.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/early-access" className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-white px-7 py-3 text-sm font-medium text-(--brand-ink) shadow-lg shadow-black/20 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
                Register your studio
              </Link>
              {!isPreregistrationOnly() ? (
                <Link href="/login" className="inline-flex min-h-12 w-full items-center justify-center rounded-full border border-white/25 bg-white/5 px-7 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:w-auto">
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>
        </ImageSection>
      </main>
    </MarketingLayout>
  );
}

function AnnouncementStrip() {
  return (
    <section className="border-b border-(--brand-line) bg-(--warm-surface)">
      <div className={`${ui.pageContainer} flex flex-col gap-3 py-3 text-sm text-stone-700 sm:flex-row sm:items-center sm:justify-between`}>
        <p className="font-medium text-(--brand-ink)">Curated onboarding for independent ceramic studios and makers.</p>
        {isPromoActive() ? (
          <PromoCountdown className="text-stone-600 [&_span]:text-stone-700" />
        ) : (
          <p className="text-stone-500">Now onboarding studios across Europe.</p>
        )}
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
  tone: "hero" | "studio" | "marketplace" | "classes" | "texture";
  minHeight: string;
  align: "bottom" | "center" | "end";
  priority?: boolean;
}) {
  const overlayClass = {
    hero: "from-[#170d09]/88 via-[#24120d]/50 to-[#3c2618]/12",
    studio: "from-[#120e0b]/84 via-[#21150f]/42 to-[#4b2e21]/15",
    marketplace: "from-[#100d0b]/82 via-[#1a1411]/35 to-[#594636]/14",
    classes: "from-[#130f0d]/84 via-[#241b15]/45 to-[#5a4636]/14",
    texture: "from-[#120d0a]/90 via-[#271a14]/48 to-[#6b513d]/18",
  }[tone];

  const justifyClass = align === "bottom" ? "items-end" : align === "end" ? "items-end" : "items-center";
  const paddingClass = align === "bottom" ? "py-20 sm:py-28" : "py-18 sm:py-24";

  return (
    <section className={`relative isolate overflow-hidden ${minHeight}`}>
      <div className="absolute inset-0">{artwork}</div>
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

function HeroArtwork() {
  return (
    <svg viewBox="0 0 1600 1100" className="h-full w-full object-cover" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="heroBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f5e7d8" />
          <stop offset="38%" stopColor="#d4a984" />
          <stop offset="68%" stopColor="#8a5b3d" />
          <stop offset="100%" stopColor="#38261d" />
        </linearGradient>
        <radialGradient id="heroLight" cx="35%" cy="28%" r="40%">
          <stop offset="0%" stopColor="#fff8ef" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#fff8ef" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="1100" fill="url(#heroBg)" />
      <rect width="1600" height="1100" fill="url(#heroLight)" />
      <ellipse cx="1220" cy="760" rx="340" ry="220" fill="#31211b" fillOpacity="0.72" />
      <ellipse cx="1120" cy="760" rx="235" ry="155" fill="#795640" fillOpacity="0.95" />
      <ellipse cx="1120" cy="760" rx="130" ry="95" fill="#c59873" fillOpacity="0.95" />
      <ellipse cx="1120" cy="748" rx="88" ry="58" fill="#d7b192" />
      <path d="M900 510c74-80 152-108 212-95 36 7 64 30 73 54 10 25-5 42-29 46-57 8-117-18-181 8-45 18-78 47-112 95l-64-48c28-20 63-42 101-60Z" fill="#8d6046" fillOpacity="0.9" />
      <path d="M1235 460c58-54 115-73 157-64 29 7 50 28 57 49 7 19-4 31-22 34-42 6-87-13-134 8-33 14-57 36-81 72l-48-41c21-17 46-36 71-58Z" fill="#a77759" fillOpacity="0.82" />
      <rect x="136" y="156" width="274" height="30" rx="15" fill="#fff5ea" fillOpacity="0.42" />
      <rect x="136" y="204" width="216" height="20" rx="10" fill="#fff5ea" fillOpacity="0.18" />
      <rect x="1260" y="190" width="184" height="184" rx="34" fill="#f4e3d4" fillOpacity="0.12" />
      <ellipse cx="1362" cy="285" rx="66" ry="74" fill="#e6c2a2" fillOpacity="0.18" />
    </svg>
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

function MarketplaceArtwork() {
  return (
    <svg viewBox="0 0 1600 950" className="h-full w-full object-cover" preserveAspectRatio="xMidYMid slice" aria-hidden>
      <defs>
        <linearGradient id="marketBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f1e3d7" />
          <stop offset="40%" stopColor="#c89d78" />
          <stop offset="100%" stopColor="#4b3428" />
        </linearGradient>
      </defs>
      <rect width="1600" height="950" fill="url(#marketBg)" />
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
