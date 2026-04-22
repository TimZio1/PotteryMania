import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import StudioMoneyLedger from "@/components/dashboard/studio-money-ledger";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Activity", "money/activity", "Every payment row, in one place.");
}

export default async function StudioMoneyActivityPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <p className={ui.overline}>Money</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Activity</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Every payment row — charges, your share, and class payments. For headline totals see{" "}
          <Link href={`/dashboard/${studioId}/money/overview`} className="font-medium text-amber-900 underline">
            Overview
          </Link>
          {" "}· for trends, see{" "}
          <Link href={`/dashboard/${studioId}/money/reports`} className="font-medium text-amber-900 underline">
            Reports
          </Link>
          .
        </p>
      </div>

      <StudioMoneyLedger studioId={studioId} />
    </div>
  );
}
