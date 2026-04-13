import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";
import StudioFeaturesClient from "@/components/dashboard/studio-features-client";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Packs & add-ons", "features", "Studio subscriptions, packs, and add-ons.");
}

export default async function StudioFeaturesPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Packs & add-ons</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Packs, subscriptions & add-ons</h1>
        <p className="mt-2 text-sm text-stone-600">
          Upgrade your studio with packs, subscriptions, or individual add-ons. Bundles unlock grouped capabilities at a discount.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="flex py-4">
            <Spinner />
          </div>
        }
      >
        <StudioFeaturesClient studioId={studioId} />
      </Suspense>
    </div>
  );
}
