import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import { StudioInstructorsClient } from "@/components/dashboard/studio-instructors-client";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Instructors", "instructors", "Manage instructors and class assignments.");
}

export default async function StudioInstructorsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { ownerUserId: true } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const instructors = await prisma.instructor.findMany({
    where: { studioId },
    include: { experiences: { include: { experience: { select: { title: true } } } } },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
  const upcomingInstructorBookings = await prisma.booking.findMany({
    where: {
      studioId,
      instructorId: { not: null },
      bookingStatus: { in: ["pending", "awaiting_vendor_approval", "confirmed"] },
      slot: { slotDate: { gte: new Date() } },
    },
    select: {
      id: true,
      participantCount: true,
      instructor: { select: { id: true, name: true } },
      experience: { select: { title: true } },
      slot: { select: { slotDate: true, startTime: true, endTime: true } },
    },
    orderBy: [{ slot: { slotDate: "asc" } }, { slot: { startTime: "asc" } }],
    take: 120,
  });
  const bookingsByInstructor = new Map<
    string,
    { instructorName: string; bookings: (typeof upcomingInstructorBookings)[number][] }
  >();
  for (const booking of upcomingInstructorBookings) {
    if (!booking.instructor) continue;
    const row = bookingsByInstructor.get(booking.instructor.id) ?? {
      instructorName: booking.instructor.name,
      bookings: [],
    };
    row.bookings.push(booking);
    bookingsByInstructor.set(booking.instructor.id, row);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Operations</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Instructors</h1>
        <p className="mt-2 text-sm text-stone-600">
          Assign instructors to classes and use them in schedule planning and booking analytics.
        </p>
      </div>
      <section className={ui.card}>
        <StudioInstructorsClient studioId={studioId} initialInstructors={instructors} />
      </section>
      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-amber-950">Upcoming schedule by instructor</h2>
        {bookingsByInstructor.size === 0 ? (
          <p className="mt-2 text-sm text-stone-600">No upcoming instructor-assigned bookings yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {[...bookingsByInstructor.values()].map((group) => (
              <article key={group.instructorName} className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-stone-700">{group.instructorName}</h3>
                <ul className="mt-3 space-y-2 text-sm text-stone-700">
                  {group.bookings.map((booking) => (
                    <li key={booking.id} className="rounded-lg border border-stone-100 bg-stone-50 px-3 py-2">
                      {booking.slot.slotDate.toISOString().slice(0, 10)} · {booking.slot.startTime}-{booking.slot.endTime} ·{" "}
                      {booking.experience.title} · {booking.participantCount} guests
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
