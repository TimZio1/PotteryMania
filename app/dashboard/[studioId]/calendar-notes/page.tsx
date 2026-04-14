import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import { StudioCalendarNotesClient } from "@/components/dashboard/studio-calendar-notes-client";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Calendar notes", "calendar-notes", "Internal calendar annotations and reminders.");
}

export default async function StudioCalendarNotesPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { ownerUserId: true } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const now = new Date();
  const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);
  const notes = await prisma.calendarNote.findMany({
    where: { studioId, date: { gte: from, lte: to } },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Calendar notes</h1>
        <p className="mt-2 text-sm text-stone-600">Internal reminders and context blocks for your studio team.</p>
      </div>
      <section className={ui.card}>
        <StudioCalendarNotesClient
          studioId={studioId}
          initialNotes={notes.map((note) => ({
            id: note.id,
            date: note.date.toISOString(),
            startTime: note.startTime,
            endTime: note.endTime,
            note: note.note,
          }))}
        />
      </section>
    </div>
  );
}
