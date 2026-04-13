import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { buildStudioClassListRows } from "@/lib/studio-classes-list";
import StudioClassesClient from "@/components/dashboard/studio-classes-client";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Classes", "classes", "All your workshops, sessions, and experiences.");
}

export default async function StudioClassesPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const rows = await buildStudioClassListRows(prisma, studioId);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={ui.overline}>Teaching</p>
          <h1 className="mt-1 text-2xl font-semibold text-amber-950">Classes</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Overview of your classes, workshops, and experiences. Edit details inline, or open the class planner to manage schedules and generate bookable slots.
          </p>
        </div>
        <Link href={`/dashboard/${studioId}/guided?flow=class&step=1`} className={ui.buttonPrimary}>
          + New class
        </Link>
      </div>

      <StudioClassesClient studioId={studioId} classes={rows} />
    </div>
  );
}
