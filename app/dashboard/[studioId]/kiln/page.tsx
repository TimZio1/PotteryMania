import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import KilnManager from "@/components/dashboard/kiln-manager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioKilnPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <p className={ui.overline}>Production</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Kiln / Production</h1>
        <p className="mt-2 text-sm text-stone-600">Track firings and pieces. Status is for your studio operations only.</p>
      </div>
      <KilnManager studioId={studioId} />
    </div>
  );
}
