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
    title: "Register your studio for the catalog | Clayense",
    description:
      "Join Clayense before launch. Register your studio for the global catalog and get early access as we build tools to improve sales and studio operations.",
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
        <section className={ui.narrowContainer}>
          <div className={ui.card}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Studio catalog registration</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">
              Register your studio. Help build the global pottery community.
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/80">
              Join Clayense before launch. We are working on tools that will improve sales and studio operations for
              independent studios worldwide.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href="#register-studio"
                className="inline-flex min-h-11 items-center rounded-(--radius-button) bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Join founding studios
              </Link>
              <Link
                href="/vision"
                className="inline-flex min-h-11 items-center rounded-(--radius-button) border border-white/20 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Read our vision
              </Link>
            </div>
            <HomeLaunchStats />
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <ValueCard
                title="Get discovered"
                text="Be visible in a focused catalog built for people actively looking for pottery studios."
              />
              <ValueCard
                title="Grow sustainably"
                text="Join early as we shape practical tools to improve sales and daily studio operations."
              />
              <ValueCard
                title="Build community"
                text="Take part in a shared global network of studios that support and learn from each other."
              />
            </div>
            <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Founding studio window</p>
              <p className="mt-2 text-sm text-white/85">
                Register before launch to be part of the first wave and help shape the platform from day one.
              </p>
            </div>
            <div className="mt-5 rounded-xl border border-white/15 bg-white/5 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Our vision</p>
              <p className="mt-2 text-sm text-white/85">
                One pottery community, many studios, shared growth. Clayense exists to connect studios worldwide while
                keeping each studio in control of its identity and customers.
              </p>
              <Link href="/vision" className="mt-3 inline-block text-sm font-semibold text-white underline underline-offset-2">
                Read full vision
              </Link>
            </div>
            <div className="mt-6">
              <div id="register-studio" className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Registration form
              </div>
              <PrivateGuideForm />
            </div>
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}

function ValueCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/5 p-3">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs leading-6 text-white/80">{text}</p>
    </div>
  );
}
