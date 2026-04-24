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
      "Clayense vision: connect pottery studios worldwide, strengthen community, and build practical tools that improve sales and studio operations.",
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
              One pottery community. Many studios. Shared growth.
            </h1>
            <p className="mt-3 text-sm leading-7 text-white/85">
              We believe pottery studios everywhere should be easier to find, easier to support, and easier to run.
              Clayense is building a global studio catalog and practical tools that improve sales and studio operations.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/85">
              Our goal is simple: help studios grow without losing their identity. Each studio keeps control of its
              own profile, its own customers, and its own way of working.
            </p>
            <p className="mt-3 text-sm leading-7 text-white/85">
              We are starting with registration-first launch cohorts and improving with feedback from founding studios.
            </p>
            <div className="mt-5">
              <Link
                href="/#register-studio"
                className="inline-flex min-h-11 items-center rounded-(--radius-button) bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Register your studio
              </Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingLayout>
  );
}
