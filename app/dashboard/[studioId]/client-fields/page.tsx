import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioClientFieldsClient from "@/components/dashboard/studio-client-fields-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Client profile fields",
    "client-fields",
    "Collect persistent client profile information like preferences, allergies, and skill level.",
  );
}

export default async function StudioClientFieldsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const fields = await prisma.studioClientField.findMany({
    where: { studioId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Engagement</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Client profile fields</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Define reusable customer profile questions that are saved once and reused for future bookings.
        </p>
      </div>
      <StudioClientFieldsClient studioId={studioId} initialFields={fields} />
    </div>
  );
}
