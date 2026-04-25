import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Private artist and studio registration",
    description:
      "Private registration for independent artists and studios on PotteryMania (potterymania.com).",
    path: "/early-access",
    robots: { index: false, follow: false },
  });
}

export default function EarlyAccessPage() {
  return (
    <MarketingLayout>
      <main className="bg-[#f6f1e8] py-10 text-[#1f1a17] sm:py-16">
        <section className={ui.narrowContainer}>
          <div className={`${ui.card} border-stone-300 bg-[#f8f3ea]`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-stone-600">Private registration</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-stone-950 sm:text-4xl">
              Join the first global network & directory for independent artists and studios
            </h1>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              We are onboarding artists and studios in private. Share your basic details now. You can add a map and full
              studio address from your dashboard when you are ready.
            </p>
            <div className="mt-6">
              <PrivateGuideForm />
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
