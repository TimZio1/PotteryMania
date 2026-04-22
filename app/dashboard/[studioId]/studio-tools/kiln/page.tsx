import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { hasStudioFeature } from "@/lib/studio-features";
import { ui } from "@/lib/ui-styles";
import KilnManager from "@/components/dashboard/kiln-manager";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Kiln", "studio-tools/kiln", "Track firings and pieces in the queue.");
}

export default async function StudioKilnPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  if (!(await hasStudioFeature(studioId, "kiln_tracking"))) {
    redirect(`/dashboard/${studioId}/features`);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className={ui.overline}>Tools</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Kiln</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Track firings and pieces. Internal only — customers don&apos;t see this.</p>
      </div>
      <KilnManager studioId={studioId} />
    </div>
  );
}
