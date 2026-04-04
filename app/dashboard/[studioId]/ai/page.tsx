import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { hasStudioFeature } from "@/lib/studio-features";
import { ui } from "@/lib/ui-styles";
import StudioAiAdvisorClient from "@/components/dashboard/studio-ai-advisor-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioAiPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const entitled = await hasStudioFeature(studioId, "ai_advisor");
  const openAiConfigured = Boolean(process.env.OPENAI_API_KEY?.trim());

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className={ui.overline}>Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">AI Advisor</h1>
        <p className="mt-2 text-sm text-stone-600">
          Ask practical questions about pricing, scheduling, and growth. Answers use aggregate stats from your studio on
          PotteryMania — not generic web tips.
        </p>
      </div>

      <StudioAiAdvisorClient studioId={studioId} entitled={entitled} openAiConfigured={openAiConfigured} />

      {entitled ? (
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
          <div className={ui.cardMuted}>
            <p className="text-sm font-semibold text-amber-950">Pricing & positioning</p>
            <p className="mt-2 text-xs text-stone-600">Compare your mix of classes and products to what tends to work for small studios.</p>
          </div>
          <div className={ui.cardMuted}>
            <p className="text-sm font-semibold text-amber-950">Fill quiet slots</p>
            <p className="mt-2 text-xs text-stone-600">Brainstorm promos, bundles, or schedule tweaks using your booking pipeline counts.</p>
          </div>
          <div className={ui.cardMuted}>
            <p className="text-sm font-semibold text-amber-950">Retention ideas</p>
            <p className="mt-2 text-xs text-stone-600">Turn completed-class volume into concrete follow-up habits.</p>
          </div>
        </div>
      ) : null}

      <p className="text-xs text-stone-500">
        <Link href={`/dashboard/${studioId}`} className="text-amber-900 underline">
          Back to dashboard
        </Link>
        {" · "}
        <Link href={`/dashboard/${studioId}/features`} className="text-amber-900 underline">
          Features / Add-ons
        </Link>
      </p>
    </div>
  );
}
