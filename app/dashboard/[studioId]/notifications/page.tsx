import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioNotificationsClient from "@/components/dashboard/studio-notifications-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Notifications",
    "notifications",
    "Configure per-class notification templates and messaging channels.",
  );
}

export default async function StudioNotificationsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      id: true,
      ownerUserId: true,
      smsEnabled: true,
      twilioAccountSid: true,
      twilioPhoneNumber: true,
      whatsappNotificationsEnabled: true,
      whatsappNumber: true,
    },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [experiences, templates] = await Promise.all([
    prisma.experience.findMany({
      where: { studioId, status: "active" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.notificationTemplate.findMany({
      where: { studioId },
      orderBy: [{ templateType: "asc" }, { updatedAt: "desc" }],
      include: { experience: { select: { id: true, title: true } } },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Communication</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Notifications</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Customize lifecycle templates per class and configure SMS/WhatsApp channels.
        </p>
      </div>
      <StudioNotificationsClient
        studioId={studioId}
        experiences={experiences}
        initialTemplates={templates}
        initialChannels={{
          smsEnabled: studio.smsEnabled,
          twilioAccountSid: studio.twilioAccountSid ?? "",
          twilioAuthToken: "",
          twilioPhoneNumber: studio.twilioPhoneNumber ?? "",
          whatsappNotificationsEnabled: studio.whatsappNotificationsEnabled,
          whatsappNumber: studio.whatsappNumber ?? "",
        }}
      />
    </div>
  );
}
