import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import PackagesManager from "@/components/dashboard/packages-manager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Class packages",
    "packages",
    "Sell prepaid class bundles with tracked credits, validity windows, and package-specific class access.",
  );
}

export default async function StudioPackagesPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [experiences, packages] = await Promise.all([
    prisma.experience.findMany({
      where: { studioId, status: "active" },
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
    prisma.classPackage.findMany({
      where: { studioId },
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      include: {
        items: {
          include: {
            experience: { select: { id: true, title: true } },
          },
        },
        _count: { select: { purchases: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Revenue</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Class packages</h1>
        <p className="mt-2 max-w-2xl text-sm text-stone-600">
          Create prepaid bundles so regular students can book classes from their credit balance.
        </p>
      </div>
      <PackagesManager studioId={studioId} experiences={experiences} initialPackages={packages} />
    </div>
  );
}
