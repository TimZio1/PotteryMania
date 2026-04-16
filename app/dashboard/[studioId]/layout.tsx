import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import StudioPanelShell from "@/components/dashboard/studio-panel-shell";
import { getStudioPanelNavGroups } from "@/lib/studio-panel-nav";
import { getBusinessTemplateBySlug } from "@/lib/business-templates";

export const dynamic = "force-dynamic";

type Props = { children: React.ReactNode; params: Promise<{ studioId: string }> };

export default async function StudioPanelLayout({ children, params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, displayName: true, ownerUserId: true, businessTemplateSlug: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  /** First studio used to leave users as `customer`; panel access is owner-based, but APIs expect `vendor`. */
  if (user.role === "customer") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "vendor" },
    });
  }

  const navGroups = getStudioPanelNavGroups(studio.id);
  const activeBusinessTemplate = await getBusinessTemplateBySlug(studio.businessTemplateSlug);

  return (
    <StudioPanelShell
      studioId={studio.id}
      studioName={studio.displayName}
      navGroups={navGroups}
      activeBusinessTemplateName={activeBusinessTemplate?.name ?? null}
    >
      {children}
    </StudioPanelShell>
  );
}
