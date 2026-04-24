import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { organizationJsonLd, toJsonLdScript, websiteJsonLd } from "@/lib/structured-data";
import { ui } from "@/lib/ui-styles";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";

export const dynamic = "force-dynamic";

const IMPACT_SITE_VERIFICATION = "886dc8c3-9975-4330-92e4-e34425f85624";

export async function generateMetadata(): Promise<Metadata> {
  const base = buildMetadata({
    title: "Register your studio for the catalog | Clayense",
    description:
      "Join the Clayense catalog. Register your studio and tell us whether you want to offer studio profile, shop, classes, or all three.",
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
          <div className={`${ui.card} border-stone-300 bg-[#f8f3ea]`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">Studio catalog registration</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">
              Register your studio for the Clayense catalog
            </h1>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              Fill this form to join the catalog. You can choose what to activate next: studio profile, shop, classes,
              or all three.
            </p>
            <div className="mt-6">
              <PrivateGuideForm />
            </div>
          </div>
        </section>
      </main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
    </MarketingLayout>
  );
}
