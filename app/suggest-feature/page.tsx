import type { Metadata } from "next";
import { MarketingLayout } from "@/components/marketing-layout";
import { getSessionUser } from "@/lib/auth-session";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";
import { SuggestFeatureForm } from "./suggest-feature-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "Suggest a feature",
  description:
    "Have an idea that would make PotteryMania better? Send it to us in one short form — we read every one.",
  path: "/suggest-feature",
});

export default async function SuggestFeaturePage() {
  const user = await getSessionUser();

  return (
    <MarketingLayout>
      <main className={`pm-brand bg-[var(--clay)] text-[var(--ink)] ${ui.pageContainer} py-12 sm:py-20`}>
        <div className="mx-auto max-w-2xl">
          <p className="pm-caption text-[var(--heat)]">Help shape PotteryMania</p>
          <h1 className="pm-display mt-6 text-[2.25rem] leading-[0.96] text-[var(--ink)] sm:text-[3rem] lg:text-[3.5rem]">
            Suggest a feature
          </h1>
          <p className="mt-6 text-base leading-relaxed text-[var(--shadow)] sm:text-lg">
            Something missing? Something clunky? Tell us what would make your day easier. We read every idea.
          </p>

          <div className="mt-10 rounded-2xl border border-[var(--ink)]/10 bg-white p-6 shadow-[0_18px_50px_-24px_rgba(11,11,11,0.12)] ring-1 ring-[var(--ink)]/5 sm:p-8">
            <SuggestFeatureForm defaultEmail={user?.email ?? ""} />
          </div>

          <p className="mt-10 text-sm text-[var(--shadow)]">
            Prefer email? Reach us through our{" "}
            <a
              className="font-medium text-[var(--heat)] underline decoration-[var(--heat)]/35 underline-offset-4 hover:text-[var(--ink)]"
              href="/pricing#faq"
            >
              FAQ
            </a>
            .
          </p>
        </div>
      </main>
    </MarketingLayout>
  );
}
