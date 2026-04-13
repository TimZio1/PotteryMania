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
        {instructors.length === 0 ? (
          <p className="text-sm text-stone-600">No instructors configured.</p>
        ) : (
          <ul className="space-y-3">
            {instructors.map((instructor) => (
              <li key={instructor.id} className="rounded-xl border border-stone-200 bg-white p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-stone-900">{instructor.name}</p>
                  <p className="text-xs text-stone-500">{instructor.isActive ? "Active" : "Inactive"}</p>
                </div>
                {instructor.bio ? <p className="mt-1 text-sm text-stone-700">{instructor.bio}</p> : null}
                <p className="mt-2 text-xs text-stone-500">
                  Classes: {instructor.experiences.map((link) => link.experience.title).join(", ") || "None"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
