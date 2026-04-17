import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { buildStudentCrmRows } from "@/lib/studio-student-crm";
import StudioStudentsClient from "@/components/dashboard/studio-students-client";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Guests", "guests", "Contacts, booking history, and notes.");
}

export default async function StudioGuestsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const initialStudents = await buildStudentCrmRows(prisma, studioId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Guests</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Guests</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Booking history merged with saved contacts. Search and tag filters, side panel for notes — add contacts who have not booked yet.
        </p>
      </div>

      <StudioStudentsClient studioId={studioId} initialStudents={initialStudents} />
    </div>
  );
}
