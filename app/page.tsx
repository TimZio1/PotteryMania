import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { organizationJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/structured-data";
import { ui } from "@/lib/ui-styles";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";
import { HomeLaunchStats } from "@/app/home-launch-stats";

export const dynamic = "force-dynamic";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "The global network for pottery studios | ClaySense",
    description:
      "Discover, support, and grow without losing your identity. Join the first studios building ClaySense.",
    path: "/",
  });
  return {
    ...base,
    other: {
      "impact-site-verification": IMPACT_SITE_VERIFICATION,
    },
  };
}

export default function Home() {
  const jsonLd = toJsonLdScript([websiteJsonLd(), organizationJsonLd()]);
  return (
    <MarketingLayout>
      <main className="bg-[#f6f1e8] py-8 text-[#1f1a17] sm:py-12">
        <section className={ui.pageContainer}>
          <div className="mx-auto max-w-3xl">
            <div className={ui.card}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                The global network for pottery studios
              </p>
              <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">
                Discover, support, and grow — without losing your identity.
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/80">
                <span className="font-semibold text-white">Get discovered. Get bookings. Stay in control.</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/#register-studio"
                  className="inline-flex min-h-11 items-center rounded-(--radius-button) bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Join the first studios
                </Link>
                <Link
                  href="/#how-it-works"
                  className="inline-flex min-h-11 items-center rounded-(--radius-button) border border-white/25 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  See how it works
                </Link>
              </div>

              <HomeLaunchStats />
              <div className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Most studios don&apos;t have a growth system.</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Most pottery studios are hard to find. Bookings are scattered across messages, links, and tools.
                  Growth depends on time you don&apos;t have.
                </p>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  You don&apos;t need more tools. You need visibility, structure, and control.
                </p>
              </div>

              <div className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">A better way to run your studio.</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  ClaySense connects pottery studios to a global audience and gives them the tools to run their
                  business properly.
                </p>
                <ul className="mt-3 space-y-2 text-sm text-white/85">
                  <li>- Get discovered by new customers</li>
                  <li>- Manage bookings in one place</li>
                  <li>- Grow without giving up control</li>
                </ul>
              </div>

              <div className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">You stay in control.</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  You own your customers. You control your studio. We don&apos;t take ownership — we build
                  infrastructure.
                </p>
                <p className="mt-3 text-sm leading-7 text-white/80">No marketplace lock-in. No platform dependency.</p>
              </div>

              <div id="how-it-works" className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">How it works</h2>
                <ol className="mt-3 space-y-3 text-sm text-white/85">
                  <li>
                    <span className="font-semibold text-white">1. Create your studio profile</span>
                    <p className="mt-1 text-white/80">Show your work, your space, your identity.</p>
                  </li>
                  <li>
                    <span className="font-semibold text-white">2. Start receiving bookings</span>
                    <p className="mt-1 text-white/80">Customers find and book you directly.</p>
                  </li>
                  <li>
                    <span className="font-semibold text-white">3. Manage everything in one place</span>
                    <p className="mt-1 text-white/80">Simple tools to run your studio without chaos.</p>
                  </li>
                </ol>
              </div>

              <div className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Built with real studios</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Early studios are already joining from across Europe.
                </p>
                <p className="mt-2 text-sm font-medium text-white/90">Rhodes · Berlin · Copenhagen · Amsterdam</p>
                <blockquote className="mt-4 border-l-2 border-white/30 pl-4 text-sm italic text-white/80">
                  &ldquo;Finally something built for how studios actually work.&rdquo; — Founding studio
                </blockquote>
              </div>

              <div className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">We&apos;re building this together</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  We&apos;re starting with studios who want more than just tools.
                </p>
                <p className="mt-2 text-sm leading-7 text-white/80">
                  Studios that want visibility, control, and a stronger connection to a global network.
                </p>
                <p className="mt-2 text-sm leading-7 text-white/80">
                  Join early. Help shape what ClaySense becomes.
                </p>
              </div>

              <div className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Grow your studio — on your terms.</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Join the global network for pottery studios.
                </p>
                <div className="mt-4">
                  <Link
                    href="/#register-studio"
                    className="inline-flex min-h-11 items-center rounded-(--radius-button) bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    Get started
                  </Link>
                </div>
              </div>

              <div id="register-studio" className="mt-6 border-t border-white/15 pt-6">
                <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                  Registration form
                </div>
                <PrivateGuideForm />
              </div>
            </div>
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}
