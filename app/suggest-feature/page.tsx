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
      <main className={`${ui.pageContainer} py-10 sm:py-14`}>
        <div className="mx-auto max-w-2xl">
          <p className={ui.overline}>Help shape PotteryMania</p>
          <h1 className="mt-3 font-serif text-4xl tracking-tight text-[var(--foreground)] sm:text-5xl">
            Suggest a feature
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-[var(--muted)]">
            Something missing? Something clunky? Tell us what would make your day easier. We read every idea.
          </p>

          <div className="mt-8">
            <SuggestFeatureForm defaultEmail={user?.email ?? ""} />
          </div>

          <p className="mt-8 text-sm text-[var(--muted)]">
            Prefer email? Reach us through our <a className="underline hover:text-[var(--foreground)]" href="/pricing#faq">FAQ</a>.
          </p>
        </div>
      </main>
    </MarketingLayout>
  );
}
