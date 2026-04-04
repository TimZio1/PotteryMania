import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import StudioPanelShell from "@/components/dashboard/studio-panel-shell";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ studioId: string }> };

export default async function StudioPanelLayout({ children, params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  if (user.role !== "vendor") notFound();

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, displayName: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <StudioPanelShell studioId={studio.id} studioName={studio.displayName}>
      {children}
    </StudioPanelShell>
  );
}
