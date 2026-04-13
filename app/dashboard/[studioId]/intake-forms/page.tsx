import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioIntakeFormsClient from "@/components/dashboard/studio-intake-forms-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Booking questions",
    "intake-forms",
    "Collect booking answers, waivers, and custom intake details before checkout.",
  );
}

export default async function StudioIntakeFormsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [experiences, forms] = await Promise.all([
    prisma.experience.findMany({
      where: { studioId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.intakeForm.findMany({
      where: { studioId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        experiences: {
          select: {
            experienceId: true,
            experience: { select: { id: true, title: true } },
          },
        },
      },
    }),
  ]);

  const initialForms = forms.map((form) => ({
    ...form,
    experienceIds: form.experiences.map((link) => link.experienceId),
    linkedExperiences: form.experiences.map((link) => ({
      id: link.experience.id,
      title: link.experience.title,
    })),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Booking setup</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Booking questions</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Build intake questions per class so customers can share preferences, consent, dates, or file links before the
          booking is confirmed.
        </p>
      </div>

      <StudioIntakeFormsClient studioId={studioId} experiences={experiences} initialForms={initialForms} />
    </div>
  );
}
