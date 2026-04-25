import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { organizationJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/structured-data";
import { ui } from "@/lib/ui-styles";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";
import { HomeLaunchStats } from "@/app/home-launch-stats";
import { HomeScrollReset } from "@/app/home-scroll-reset";

export const dynamic = "force-dynamic";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "The first global network & directory for independent artists and studios | PotteryMania",
    description:
      "Register on potterymania.com — the global network and directory for independent pottery artists and studios.",
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
      <HomeScrollReset />
      <main className="bg-[#f6f1e8] py-8 text-[#1f1a17] sm:py-12">
        <section className={ui.pageContainer}>
          <div className="mx-auto max-w-3xl">
            <div className={ui.card}>
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">
                Potters only
              </p>
              <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">
                Discover, support, and grow without losing your identity.
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/80">
                <span className="font-semibold text-white">Get discovered. Get bookings. Stay in control.</span>
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <Link
                  href="/#register-studio"
                  className="inline-flex min-h-11 items-center rounded-(--radius-button) bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Register for free
                </Link>
              </div>

              <HomeLaunchStats />
              <div className="mt-6 border-t border-white/15 pt-6">
                <h2 className="text-xl font-semibold text-white sm:text-2xl">Built for artists and studios.</h2>
                <p className="mt-3 text-sm leading-7 text-white/80">
                  Create your profile and join the first global network & directory
                  built around identity, visibility, and control. You can add your map and full address in the
                  dashboard later.
                </p>
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
