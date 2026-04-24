import type { Metadata } from "next";
import Link from "next/link";
import { MarketingLayout } from "@/components/marketing-layout";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Our vision | Clayense",
    description:
      "Clayense vision: the first global network & directory for independent artists and studios.",
    path: "/vision",
  });
}

export default function VisionPage() {
  return (
    <MarketingLayout>
      <main className="bg-[#f6f1e8] py-8 text-[#1f1a17] sm:py-12">
        <section className={ui.narrowContainer}>
          <div className={ui.card}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Clayense vision</p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-white sm:text-4xl">
              The first global network & directory for independent artists and studios.
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/85">
              We believe independent pottery artists and studios should be easier to find, easier to support, and easier
              to grow.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/85">
              Clayense is built around visibility, identity, and control. Artists and studios keep their own voice,
              customers, and way of working.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/85">
              We are starting with founding artists and studios and improving with their feedback.
            </p>
            <div className="mt-5">
              <Link
                href="/#register-studio"
                className="inline-flex min-h-11 items-center rounded-(--radius-button) bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Register your artist or studio profile
              </Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
