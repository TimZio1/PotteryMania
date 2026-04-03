import type { Metadata } from "next";
import Link from "next/link";
import { EarlyAccessForm } from "./early-access-form";

export const metadata: Metadata = {
  title: "Early Access — PotteryMania",
  description:
    "Register your ceramic studio for free early access. Sell pottery, book classes, grow your audience — all in one place.",
};

export default function EarlyAccessPage() {
  return (
    <div className="min-h-screen bg-stone-50">
      {/* Minimal header */}
      <header className="border-b border-stone-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:h-16 sm:px-6">
          <Link href="/" className="text-base font-semibold tracking-tight text-amber-950 sm:text-lg">
            PotteryMania
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:bg-stone-50"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-linear-to-b from-amber-50/80 via-stone-50 to-stone-50 pb-16 pt-16 sm:pb-24 sm:pt-24">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-amber-800">Coming soon</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-amber-950 sm:text-5xl lg:text-6xl">
            Something new is coming to ceramics
          </h1>
          <p className="mx-auto mt-6 max-w-lg text-lg text-stone-600">
            The first platform built by potters, for potters. Sell your work. Fill your classes. Grow your studio — all
            from one place.
          </p>
        </div>
      </section>

      {/* Value props */}
      <section className="border-t border-stone-200/60 bg-white py-12 sm:py-16">
        <div className="mx-auto grid max-w-4xl gap-8 px-4 sm:grid-cols-3 sm:px-6">
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a1.897 1.897 0 0 1-.61-1.276c-.036-.39.016-.778.166-1.13L5.6 2.05a1 1 0 0 1 .917-.592h10.966a1 1 0 0 1 .917.592l2.294 4.892c.15.352.202.74.166 1.131a1.897 1.897 0 0 1-.61 1.276" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-amber-950">Marketplace</h3>
            <p className="mt-2 text-sm text-stone-600">
              Sell ceramics globally. No listing fees. 5% commission only when you make a sale.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-amber-950">Booking system</h3>
            <p className="mt-2 text-sm text-stone-600">
              Workshops, classes, open sessions — customers book and pay online. You teach.
            </p>
          </div>
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-900">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-amber-950">Instant payouts</h3>
            <p className="mt-2 text-sm text-stone-600">
              Money goes straight to you via Stripe. We never hold your funds.
            </p>
          </div>
        </div>
      </section>

      {/* Registration form */}
      <section id="register" className="bg-stone-50 py-12 sm:py-20">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <div className="rounded-2xl border border-stone-200/90 bg-white p-6 shadow-sm sm:p-8">
            <h2 className="text-center text-xl font-semibold tracking-tight text-amber-950 sm:text-2xl">
              Register your studio
            </h2>
            <p className="mt-2 text-center text-sm text-stone-500">
              Free. No commitment. We&apos;ll reach out when we launch.
            </p>
            <div className="mt-8">
              <EarlyAccessForm />
            </div>
          </div>
        </div>
      </section>

      {/* Social proof / trust */}
      <section className="border-t border-stone-200/60 bg-white py-12 sm:py-16">
        <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
          <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Built for ceramicists</p>
          <h2 className="mt-4 text-2xl font-semibold text-amber-950">Why studios are joining</h2>
          <div className="mt-10 grid gap-6 text-left sm:grid-cols-2">
            <div className="rounded-xl bg-stone-50 p-5">
              <p className="text-sm italic text-stone-700">
                &ldquo;Finally a platform that understands pottery isn&apos;t just e-commerce — it&apos;s about the experience too.&rdquo;
              </p>
              <p className="mt-3 text-xs font-medium text-stone-500">— Studio owner, Athens</p>
            </div>
            <div className="rounded-xl bg-stone-50 p-5">
              <p className="text-sm italic text-stone-700">
                &ldquo;I&apos;ve been managing classes on spreadsheets. This is exactly what I need.&rdquo;
              </p>
              <p className="mt-3 text-xs font-medium text-stone-500">— Workshop instructor, Barcelona</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200/80 bg-stone-50 py-8">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-sm text-stone-500">
            © {new Date().getFullYear()} PotteryMania. Made with clay and code.
          </p>
        </div>
      </footer>
    </div>
  );
}
