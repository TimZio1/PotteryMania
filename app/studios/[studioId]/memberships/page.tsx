import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";
const MEMBERSHIPS_PUBLIC_ENABLED = false;

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  if (!studio) return buildMetadata({ title: "Memberships", description: "Studio memberships.", path: `/studios/${studioId}/memberships` });
  return buildMetadata({
    title: `${studio.displayName} — Memberships`,
    description: `Browse membership plans from ${studio.displayName} on PotteryMania.`,
    path: `/studios/${studioId}/memberships`,
  });
}

export default async function StudioMembershipsPublicPage({ params }: Props) {
  const { studioId } = await params;
  // Kill-list execution: keep memberships hidden until secure checkout is production-ready.
  if (!MEMBERSHIPS_PUBLIC_ENABLED) notFound();

  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: {
      id: true,
      displayName: true,
      memberships: {
        where: { isActive: true, isVisible: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          experiences: { include: { experience: { select: { id: true, title: true } } } },
        },
      },
    },
  });
  if (!studio) notFound();

  const toolbar = (
    <Breadcrumbs items={[{ label: studio.displayName, href: `/studios/${studio.id}` }, { label: "Memberships" }]} />
  );

  return (
    <MarketingLayout toolbar={toolbar}>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="max-w-3xl">
          <p className={ui.overline}>Memberships</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">{studio.displayName}</h1>
          <p className="mt-3 text-stone-600">Choose a membership plan to unlock classes included in your subscription window.</p>
        </div>

        {studio.memberships.length === 0 ? (
          <div className={`${ui.cardMuted} mt-8 max-w-xl`}>
            <p className="font-medium text-stone-800">No memberships published yet</p>
            <p className="mt-2 text-sm text-stone-600">This studio has not published memberships yet. Check back soon.</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {studio.memberships.map((membership) => (
              <article key={membership.id} className={ui.card}>
                <h2 className="text-lg font-semibold text-amber-950">{membership.name}</h2>
                {membership.description ? <p className="mt-2 text-sm text-stone-600">{membership.description}</p> : null}
                <p className="mt-3 text-sm font-medium text-stone-800">
                  €{(membership.priceCents / 100).toFixed(2)}
                  {membership.isRecurring ? " / period" : ""}
                </p>
                <p className="mt-1 text-xs text-stone-500">
                  {membership.durationDays} day access
                  {membership.sessionsPerPeriod != null ? ` · ${membership.sessionsPerPeriod} sessions` : " · unlimited sessions"}
                </p>
                <ul className="mt-3 list-inside list-disc text-xs text-stone-600">
                  {membership.experiences.map((link) => (
                    <li key={`${membership.id}-${link.experienceId}`}>{link.experience.title}</li>
                  ))}
                </ul>
                <div className={`${ui.cardMuted} mt-4 text-xs`}>
                  Membership checkout is temporarily unavailable while secure payment flow is finalized.
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </MarketingLayout>
  );
}
