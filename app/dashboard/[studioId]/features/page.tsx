import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
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
          Use <strong>Bundles</strong> when the platform offers a package, or enable add-ons individually. Hyperadmin
          controls the catalog; paid add-ons open Stripe Checkout (one subscription per feature, or one for a bundle when
          configured).
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
        <StudioFeaturesClient studioId={studioId} />
      </Suspense>
    </div>
  );
}
