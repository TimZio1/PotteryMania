import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";
import { PrivateGuideForm } from "@/app/early-access/private-guide-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Private studio guide registration",
    description:
      "Private registration for pottery studios that want to join our upcoming global studio guide.",
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
              Join the first global pottery studio guide
            </h1>
            <p className="mt-3 text-sm leading-7 text-stone-700">
              We are onboarding studios in private. Share your basic details now, then we help you activate products,
              classes, or both. Add your Google Maps link so we can pin your studio correctly in the guide.
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
