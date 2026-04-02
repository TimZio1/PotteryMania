import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioWaitlistPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const entries = await prisma.bookingWaitlistEntry.findMany({
    where: { studioId, status: "active" },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      experience: { select: { title: true } },
      slot: { select: { slotDate: true, startTime: true, endTime: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <Link href={`/dashboard/studio/${studioId}`} className="text-sm text-amber-800">
        ← Studio
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-amber-950">Waitlist — {studio.displayName}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Entries do not hold seats. Use for outreach when capacity opens.
      </p>
      <ul className="mt-6 space-y-3">
        {entries.map((e) => (
          <li key={e.id} className="rounded-lg border border-stone-200 bg-white p-4 text-sm">
            <p className="font-medium text-stone-900">{e.experience.title}</p>
            <p className="text-stone-500">
              {e.slot.slotDate.toISOString().slice(0, 10)} {e.slot.startTime}–{e.slot.endTime}
            </p>
            <p>
              {e.customerName} · {e.customerEmail}
            </p>
            <p className="text-stone-600">
              {e.participantCount} pax{e.seatType ? ` · ${e.seatType}` : ""}
            </p>
          </li>
        ))}
      </ul>
      {entries.length === 0 && <p className="mt-6 text-stone-500">No active waitlist entries.</p>}
    </div>
  );
}
