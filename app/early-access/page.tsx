import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { MarketingLayout } from "@/components/marketing-layout";
import { PrivateGuideForm } from "./private-guide-form";

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
      <main className="pm-brand min-h-[calc(100vh-6rem)] bg-[var(--clay)] text-[var(--ink)]">
        <section className="mx-auto max-w-lg px-4 py-12 sm:px-6 sm:py-20">
          <p className="pm-caption text-[var(--heat)]">Private registration</p>
          <h1 className="pm-display mt-6 text-[1.85rem] leading-[0.96] text-[var(--ink)] sm:text-[2.35rem]">
            Join the first global network & directory for independent artists and studios
          </h1>
          <p className="mt-6 text-sm leading-relaxed text-[var(--shadow)] sm:text-base">
            We are onboarding artists and studios in private. Share your basic details now. You can add a map and full
            studio address from your dashboard when you are ready.
          </p>
          <div className="mt-10 rounded-2xl border border-[var(--ink)]/10 bg-white p-6 shadow-[0_22px_70px_-30px_rgba(11,11,11,0.14)] ring-1 ring-[var(--ink)]/5 sm:p-8">
            <PrivateGuideForm />
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
