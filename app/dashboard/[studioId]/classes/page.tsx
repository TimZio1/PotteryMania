import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioClassesPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const experiences = await prisma.experience.findMany({
    where: { studioId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      capacity: true,
      priceCents: true,
      experienceType: true,
      skillLevel: true,
      durationMinutes: true,
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={ui.overline}>Teaching</p>
          <h1 className="mt-1 text-2xl font-semibold text-amber-950">Classes</h1>
          <p className="mt-2 text-sm text-stone-600">Experiences and schedules. Deep editing uses the class builder.</p>
        </div>
        <Link href={`/dashboard/experiences/${studioId}`} className={ui.buttonPrimary}>
          Open class builder
        </Link>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Level</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Public</th>
            </tr>
          </thead>
          <tbody>
            {experiences.map((e) => (
              <tr key={e.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-3 font-medium text-stone-900">{e.title}</td>
                <td className="px-4 py-3 text-stone-600">{e.status}</td>
                <td className="px-4 py-3 text-stone-600">{e.experienceType}</td>
                <td className="px-4 py-3 text-stone-600">{e.skillLevel ?? "—"}</td>
                <td className="px-4 py-3 text-stone-600">{e.capacity}</td>
                <td className="px-4 py-3 text-stone-600">€{(e.priceCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">
                  <Link href={`/classes/${e.id}`} className="text-amber-900 hover:underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
