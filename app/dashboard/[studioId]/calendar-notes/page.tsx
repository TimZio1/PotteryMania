import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";

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
        {notes.length === 0 ? (
          <p className="text-sm text-stone-600">No notes in the current planning window.</p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note) => (
              <li key={note.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <p className="text-xs text-stone-500">
                  {note.date.toISOString().slice(0, 10)} {note.startTime ? `${note.startTime}-${note.endTime ?? ""}` : "(all day)"}
                </p>
                <p className="mt-1 text-sm text-stone-800">{note.note}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
