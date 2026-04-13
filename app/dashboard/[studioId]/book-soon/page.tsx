import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import StudioBookSoonClient from "@/components/dashboard/studio-book-soon-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Book soon reminders",
    "book-soon",
    "Create post-visit reminder campaigns to bring students back automatically.",
  );
}

export default async function StudioBookSoonPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [rules, experiences] = await Promise.all([
    prisma.bookSoonRule.findMany({
      where: { studioId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    }),
    prisma.experience.findMany({
      where: { studioId, status: "active" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Engagement</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Book soon reminders</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Send follow-up reminders a few days after class completion to encourage repeat bookings.
        </p>
      </div>
      <StudioBookSoonClient studioId={studioId} rules={rules} experiences={experiences} />
    </div>
  );
}
