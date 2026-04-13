import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioAddOnsClient from "@/components/dashboard/studio-add-ons-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Class add-ons",
    "add-ons",
    "Create optional booking extras like premium materials, firing upgrades, and giftable add-ons.",
  );
}

export default async function StudioAddOnsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [experiences, addOns] = await Promise.all([
    prisma.experience.findMany({
      where: { studioId },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.experienceAddOn.findMany({
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

  const initialAddOns = addOns.map((addOn) => ({
    ...addOn,
    experienceIds: addOn.experiences.map((link) => link.experienceId),
    linkedExperiences: addOn.experiences.map((link) => ({
      id: link.experience.id,
      title: link.experience.title,
    })),
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Booking setup</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Class add-ons</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Mirror the best parts of SimplyBook add-ons: assign optional extras to classes, price them clearly, and save
          the chosen extras on each reservation.
        </p>
      </div>

      <StudioAddOnsClient studioId={studioId} experiences={experiences} initialAddOns={initialAddOns} />
    </div>
  );
}
