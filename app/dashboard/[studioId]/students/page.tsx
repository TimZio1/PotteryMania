import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioStudentsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const bookings = await prisma.booking.findMany({
    where: {
      studioId,
      bookingStatus: { in: ["confirmed", "completed", "awaiting_vendor_approval", "no_show"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      customerEmail: true,
      customerName: true,
      customerPhone: true,
      participantCount: true,
      bookingStatus: true,
      createdAt: true,
      experience: { select: { title: true } },
      slot: { select: { slotDate: true } },
    },
  });

  const map = new Map<
    string,
    {
      email: string;
      name: string;
      phone: string | null;
      visits: number;
      participants: number;
      lastAt: Date;
      lastClass: string;
    }
  >();

  for (const b of bookings) {
    const key = b.customerEmail.toLowerCase();
    const cur = map.get(key);
    if (!cur) {
      map.set(key, {
        email: b.customerEmail,
        name: b.customerName,
        phone: b.customerPhone,
        visits: 1,
        participants: b.participantCount,
        lastAt: b.createdAt,
        lastClass: b.experience.title,
      });
    } else {
      cur.visits += 1;
      cur.participants += b.participantCount;
      if (b.createdAt > cur.lastAt) {
        cur.lastAt = b.createdAt;
        cur.lastClass = b.experience.title;
      }
      if (!cur.phone && b.customerPhone) cur.phone = b.customerPhone;
    }
  }

  const rows = Array.from(map.values()).sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>People</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Students</h1>
        <p className="mt-2 text-sm text-stone-600">
          Built from booking history. Tags, notes, and manual adds can extend this list later.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Bookings</th>
              <th className="px-4 py-3">Participants (sum)</th>
              <th className="px-4 py-3">Last class</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-500">
                  No students yet — bookings will appear here.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.email} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-stone-900">{r.name}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {r.email}
                    {r.phone ? (
                      <>
                        <br />
                        <span className="text-xs">{r.phone}</span>
                      </>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-stone-600">{r.visits}</td>
                  <td className="px-4 py-3 text-stone-600">{r.participants}</td>
                  <td className="px-4 py-3 text-stone-600">
                    {r.lastClass}
                    <br />
                    <span className="text-xs">{r.lastAt.toISOString().slice(0, 10)}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
