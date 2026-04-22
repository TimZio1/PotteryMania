import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { MyPackagesPanel } from "@/components/packages/my-packages-panel";
import { buildMetadata } from "@/lib/seo";
import { ui } from "@/lib/ui-styles";

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "My packages",
    description: "The class credits you’ve bought, where to use them, and when they expire.",
    path: "/my-packages",
  });
}

export default async function MyPackagesPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/my-packages");

  const qs = (await searchParams) ?? {};
  const packagePurchaseStatus = typeof qs.package_purchase === "string" ? qs.package_purchase : "";
  const initialMessage =
    packagePurchaseStatus === "success" ? "Your package is ready — credits are in, ready to spend on a class." : "";

  const purchases = await prisma.classPackagePurchase.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      package: {
        include: {
          studio: { select: { id: true, displayName: true } },
          items: {
            include: {
              experience: { select: { id: true, title: true } },
            },
          },
        },
      },
    },
  });

  const serialized = purchases.map((purchase) => ({
    ...purchase,
    startsAt: purchase.startsAt.toISOString(),
    expiresAt: purchase.expiresAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <div>
        <p className={ui.overline}>Account</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">My packages</h1>
        <p className="mt-2 text-sm text-stone-600">
          Pre-paid class bundles. At checkout, spend a credit instead of paying again.
        </p>
      </div>
      <MyPackagesPanel packagePurchases={serialized} initialMessage={initialMessage} />
    </div>
  );
}
