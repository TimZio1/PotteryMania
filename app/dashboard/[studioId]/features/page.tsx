import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { STUDIO_FEATURE_CATALOG } from "@/lib/studio-feature-catalog";
import { ui } from "@/lib/ui-styles";
import StudioFeaturesClient from "@/components/dashboard/studio-features-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioFeaturesPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Add-ons</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Features / Add-ons</h1>
        <p className="mt-2 text-sm text-stone-600">
          Turn capabilities on in your preferences. Platform billing and instant activation will connect in a later
          release — your choices are saved now.
        </p>
      </div>
      <StudioFeaturesClient studioId={studioId} catalog={STUDIO_FEATURE_CATALOG} />
    </div>
  );
}
