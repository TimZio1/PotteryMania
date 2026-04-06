import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { buildStudentCrmRows } from "@/lib/studio-student-crm";
import StudioStudentsClient from "@/components/dashboard/studio-students-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioStudentsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const initialStudents = await buildStudentCrmRows(prisma, studioId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>People</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Students</h1>
        <p className="mt-2 text-sm text-stone-600">
          Booking history merged with saved contacts. Search and tag filters, side panel for notes — add contacts who have not booked yet.
        </p>
      </div>

      <StudioStudentsClient studioId={studioId} initialStudents={initialStudents} />
    </div>
  );
}
