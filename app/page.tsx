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
    title: "Register your pottery business | Clayense global directory",
    description:
      "Join Clayense before launch. Register your pottery business in the global directory and get early access as we build tools to improve sales and studio operations.",
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Global directory registration</p>
              <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">
                Register your pottery business in the Clayense global directory
              </h1>
              <p className="mt-3 text-sm leading-7 text-white/80">
                Join before launch. We are working on tools that will improve sales and studio operations for
                independent studios worldwide.
              </p>
              <div className="mt-4">
                <Link
                  href="/#register-studio"
                  className="inline-flex min-h-11 items-center rounded-(--radius-button) bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Register for free
                </Link>
              </div>
              <HomeLaunchStats />
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
