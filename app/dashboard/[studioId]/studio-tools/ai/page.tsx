import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { hasStudioFeature } from "@/lib/studio-features";
import { ui } from "@/lib/ui-styles";
import StudioAiAdvisorClient from "@/components/dashboard/studio-ai-advisor-client";
import StudioMonetizedInsightsPanel from "@/components/dashboard/studio-monetized-insights-panel";
import { listStudioInsightsPayload } from "@/lib/ai/ensure-studio-insights";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "AI advisor", "studio-tools/ai", "Ideas and insights from your studio's own data.");
}

export default async function StudioAiPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const entitled = await hasStudioFeature(studioId, "ai_advisor");
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());
  const monetizedInsights = await listStudioInsightsPayload(prisma, studioId, { take: 12 });

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className={ui.overline}>Tools</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">AI advisor</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Insight cards use your real bookings and listings. The chat below is separate — add-on required.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Data insights</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Preview for free. Unlock the full breakdown for a one-time payment.
        </p>
        <div className="mt-4">
          <StudioMonetizedInsightsPanel studioId={studioId} initialInsights={monetizedInsights} variant="full" />
        </div>
      </div>

      <StudioAiAdvisorClient studioId={studioId} entitled={entitled} openAiConfigured={openAiConfigured} />

      {entitled ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
          <div className={ui.cardMuted}>
            <p className="text-sm font-semibold text-[var(--foreground)]">Pricing ideas</p>
            <p className="mt-2 text-xs text-[var(--muted)]">How your mix of classes and products compares to similar studios.</p>
          </div>
          <div className={ui.cardMuted}>
            <p className="text-sm font-semibold text-[var(--foreground)]">Fill quiet slots</p>
            <p className="mt-2 text-xs text-[var(--muted)]">Promo, bundle, and schedule suggestions based on your booking trend.</p>
          </div>
          <div className={ui.cardMuted}>
            <p className="text-sm font-semibold text-[var(--foreground)]">Keep guests coming back</p>
            <p className="mt-2 text-xs text-[var(--muted)]">Follow-up ideas tied to the classes people just finished.</p>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-[var(--muted)]">
        <Link href={`/dashboard/${studioId}`} className="text-amber-900 underline">
          Back to dashboard
        </Link>
        {" · "}
        <Link href={`/dashboard/${studioId}/features`} className="text-amber-900 underline">
          Add-ons
        </Link>
      </p>
    </div>
  );
}
