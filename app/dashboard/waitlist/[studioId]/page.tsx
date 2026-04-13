import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { dashboardFlatMeta } from "@/lib/dashboard-metadata";
import { WaitlistClient } from "./waitlist-client";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardFlatMeta(studioId, "Waitlist", "waitlist", "Active waitlist entries for your sessions.");
}

export default async function WaitlistPage({ params }: Props) {
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
      experience: { select: { id: true, title: true } },
      slot: { select: { id: true, slotDate: true, startTime: true, endTime: true, status: true } },
    },
  });

  const serialized = entries.map((e) => ({
    id: e.id,
    customerName: e.customerName,
    customerEmail: e.customerEmail,
    participantCount: e.participantCount,
    createdAt: e.createdAt.toISOString(),
    experienceTitle: e.experience?.title ?? "Unknown class",
    slotDate: e.slot?.slotDate?.toISOString().slice(0, 10) ?? null,
    slotTime: e.slot?.startTime ?? null,
    slotStatus: e.slot?.status ?? null,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <div>
        <p className={ui.overline}>Bookings</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Session waitlist</h1>
        <p className="mt-2 max-w-xl text-sm text-stone-600">
          People waiting for a spot when your classes are full. Reach out directly when a seat opens up.
        </p>
      </div>

      <WaitlistClient studioId={studioId} entries={serialized} />
    </div>
  );
}
