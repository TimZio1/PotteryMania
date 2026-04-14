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
    </div>
  );
}
