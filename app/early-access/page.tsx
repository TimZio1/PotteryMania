import type { Metadata } from "next";
import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { prisma } from "@/lib/db";
import { PromoCountdown } from "@/components/promo-countdown";
import { isPromoActive } from "@/lib/promo";
import { buildMetadata } from "@/lib/seo";
import { EarlyAccessForm } from "./early-access-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Early Access — Claim Your Studio",
  description:
    "Pre-register your ceramic studio. 3 months free, then €5/month. Sell pottery, book classes, grow your audience — the ceramics platform built for makers.",
  path: "/early-access",
});

export default async function EarlyAccessPage() {
  const initialCount = await prisma.earlyAccessSignup.count();
  const promoActive = isPromoActive();

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      {/* Minimal header */}
      <header className="absolute inset-x-0 top-0 z-30">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:h-18 sm:px-6">
          <BrandLogo href="/" variant="on-dark" priority />
          <Link
            href="/login"
            className="shrink-0 text-sm font-medium text-white/90 underline-offset-4 transition hover:text-white hover:underline"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Full-viewport hero */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        {/* Background artwork */}
        <div className="absolute inset-0">
          <EarlyAccessArtwork />
        </div>
        <div className="absolute inset-0 bg-linear-to-t from-[#120d0a]/92 via-[#271a14]/55 to-[#6b513d]/20" aria-hidden />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.08),transparent_50%)]" aria-hidden />

        {/* Content */}
        <div className="relative z-10 mx-auto w-full max-w-xl px-5 pt-24 pb-16 sm:px-6 sm:pt-28 sm:pb-20">
          <div className="mb-8 flex justify-center sm:mb-10">
            <BrandLogo href="/" variant="on-dark" size="lg" priority />
          </div>

          {/* Urgency banner */}
          {promoActive && (
            <div className="mb-8 flex flex-col items-center gap-3 text-center sm:mb-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-red-400/20 bg-red-500/10 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-red-200 backdrop-blur-sm">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" aria-hidden />
                Closes May 1st
              </span>
              <PromoCountdown className="text-stone-300 [&_span]:text-white" />
            </div>
          )}

          {/* Headline */}
          <div className="text-center">
            <h1 className="font-serif text-5xl leading-[0.92] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Claim your studio.
            </h1>
            <p className="mx-auto mt-5 max-w-md text-base leading-7 text-stone-200/90 sm:text-lg sm:leading-8">
              The ceramics platform for makers who sell, teach, and grow.
              <br className="hidden sm:block" />
              <span className="font-medium text-white">3 months free.</span> Then €5/month.
            </p>
          </div>

          {/* Form card */}
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/95 p-6 shadow-2xl shadow-black/30 backdrop-blur-md sm:mt-10 sm:p-8">
            <EarlyAccessForm initialCount={initialCount} />
          </div>
        </div>
      </section>

      {/* Below fold: value props */}
      <section className="border-t border-(--brand-line) bg-white">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-24">
          <div className="mb-8 flex justify-center sm:mb-10">
            <BrandLogo href="/" size="md" className="text-(--brand-ink)" />
          </div>
          <p className="text-center text-xs font-medium uppercase tracking-[0.24em] text-stone-400">
            Everything your studio needs
          </p>
          <h2 className="mt-4 text-center font-serif text-3xl leading-tight text-(--brand-ink) sm:text-4xl">
            Sell. Teach. Get discovered.
          </h2>
          <div className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            <ValueProp
              title="Marketplace"
              body="Present ceramics with gallery-level care. No listing fees. 5% commission only when you sell."
            />
            <ValueProp
              title="Booking"
              body="Workshops, classes, open sessions. Customers book and pay online. You teach."
            />
            <ValueProp
              title="Direct payouts"
              body="Money goes to your Stripe account. We never hold funds. You stay in control."
            />
          </div>
        </div>
      </section>

      {/* Social proof */}
      <section className="border-t border-(--brand-line) bg-(--warm-surface)">
        <div className="mx-auto max-w-3xl px-5 py-16 sm:px-6 sm:py-20">
          <div className="grid gap-6 sm:grid-cols-2">
            <Testimonial
              quote="Finally, a platform that understands pottery is not just e-commerce. It is atmosphere, teaching, and trust."
              author="Studio owner, Athens"
            />
            <Testimonial
              quote="I have been managing classes across calendars and spreadsheets. This feels like something real."
              author="Workshop instructor, Barcelona"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-(--brand-line) bg-(--brand-soft)">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>&copy; {new Date().getFullYear()} PotteryMania.</p>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Link href="/login" className="font-medium text-stone-600 transition hover:text-(--brand-ink)">
              Studio / admin sign in
            </Link>
            <span className="hidden text-stone-300 sm:inline" aria-hidden>
              ·
            </span>
            <span>Made with clay and code.</span>
          </p>
        </div>
      </footer>
    </div>
  );
}

function ValueProp({ title, body }: { title: string; body: string }) {
  return (
    <div className="text-center">
      <h3 className="font-serif text-xl text-(--brand-ink)">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-stone-600">{body}</p>
    </div>
  );
}

function Testimonial({ quote, author }: { quote: string; author: string }) {
  return (
    <article className="rounded-2xl border border-(--brand-line) bg-white p-6">
      <p className="text-sm leading-7 text-stone-700 italic">&ldquo;{quote}&rdquo;</p>
      <p className="mt-4 text-xs font-medium uppercase tracking-[0.16em] text-stone-400">{author}</p>
    </article>
  );
}

function EarlyAccessArtwork() {
  return (
    <svg
      viewBox="0 0 1600 1000"
      className="h-full w-full object-cover"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden
    >
      <defs>
        <linearGradient id="eaBg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#e6cfbb" />
          <stop offset="35%" stopColor="#9f6f54" />
          <stop offset="70%" stopColor="#5a3a28" />
          <stop offset="100%" stopColor="#2e1f18" />
        </linearGradient>
        <radialGradient id="eaLight" cx="50%" cy="30%" r="45%">
          <stop offset="0%" stopColor="#fff8ef" stopOpacity="0.22" />
          <stop offset="100%" stopColor="#fff8ef" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="1000" fill="url(#eaBg)" />
      <rect width="1600" height="1000" fill="url(#eaLight)" />
      {/* Ceramic forms */}
      <ellipse cx="260" cy="680" rx="180" ry="100" fill="#f6ede3" fillOpacity="0.15" />
      <ellipse cx="260" cy="600" rx="100" ry="150" fill="#d8b393" fillOpacity="0.12" />
      <ellipse cx="1340" cy="680" rx="180" ry="100" fill="#f6ede3" fillOpacity="0.12" />
      <ellipse cx="1340" cy="590" rx="110" ry="160" fill="#c49370" fillOpacity="0.10" />
      {/* Subtle wave layers */}
      <path
        d="M0 620c200-40 400-10 600 30s400 60 600 20 300-60 400-40v370H0Z"
        fill="#f5e7da"
        fillOpacity="0.08"
      />
      <path
        d="M0 720c180-30 360 10 540 40s360 40 540 10 280-40 520-20v250H0Z"
        fill="#c69471"
        fillOpacity="0.06"
      />
      {/* Floating circles */}
      <circle cx="180" cy="280" r="50" fill="#fff8ef" fillOpacity="0.04" />
      <circle cx="1420" cy="320" r="65" fill="#fff8ef" fillOpacity="0.04" />
      <circle cx="800" cy="160" r="40" fill="#fff8ef" fillOpacity="0.03" />
    </svg>
  );
}
