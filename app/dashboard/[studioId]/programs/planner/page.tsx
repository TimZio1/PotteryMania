import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { StudioClosedDaysSection } from "./studio-closed-days";
import { ExperienceSchedulePanelWrapper } from "./experience-schedule-panel-wrapper";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Planner", "programs/planner", "Schedule rules, slot generation, and studio closed days.");
}

export default async function ClassPlannerPage({ params }: Props) {
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
      recurringRules: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          scheduleType: true,
          startTime: true,
          endTime: true,
          weekdays: true,
          recurrenceStartDate: true,
          recurrenceEndDate: true,
          capacityPerSlot: true,
          isActive: true,
        },
      },
    },
  });

  const serialized = experiences.map((e) => ({
    id: e.id,
    title: e.title,
    status: e.status,
    rules: e.recurringRules.map((r) => ({
      id: r.id,
      scheduleType: r.scheduleType,
      startTime: r.startTime,
      endTime: r.endTime,
      weekdays: r.weekdays,
      recurrenceStartDate: r.recurrenceStartDate?.toISOString() ?? null,
      recurrenceEndDate: r.recurrenceEndDate?.toISOString() ?? null,
      capacityPerSlot: r.capacityPerSlot,
      isActive: r.isActive,
    })),
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className={ui.overline}>Scheduling</p>
          <h1 className="mt-1 text-2xl font-semibold text-amber-950">Class planner</h1>
          <p className="mt-2 max-w-xl text-sm text-stone-600">
            Add schedule rules to your classes, generate bookable time slots, and manage studio-wide closed days.
          </p>
        </div>
        <Link href={`/dashboard/${studioId}/programs`} className={ui.buttonSecondary}>
          ← All programs
        </Link>
      </div>

      <StudioClosedDaysSection studioId={studioId} />

      {serialized.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white px-5 py-8 text-center">
          <p className="text-sm text-stone-600">No classes yet. Create one first, then come back to set up schedules.</p>
          <Link href={`/dashboard/${studioId}/guided?flow=class&step=1`} className={`${ui.buttonPrimary} mt-4 inline-flex`}>
            Create your first class
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {serialized.map((exp) => (
            <ExperienceSchedulePanelWrapper
              key={exp.id}
              studioId={studioId}
              experienceId={exp.id}
              experienceTitle={exp.title}
              experienceStatus={exp.status}
              initialRules={exp.rules}
            />
          ))}
        </div>
      )}
    </div>
  );
}
