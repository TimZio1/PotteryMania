import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";
import { buildMetadata } from "@/lib/seo";
import { humanMembershipStatus } from "@/lib/status-labels";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

export function generateMetadata(): Metadata {
  return buildMetadata({
    title: "My memberships",
    description: "Your studio memberships and how many sessions you have left this month.",
    path: "/my-memberships",
  });
}

export default async function MyMembershipsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/my-memberships");

  const memberships = await prisma.membershipPurchase.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }],
    include: {
      membership: {
        include: {
          studio: { select: { id: true, displayName: true } },
          experiences: { include: { experience: { select: { id: true, title: true } } } },
        },
      },
    },
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <div>
        <p className={ui.overline}>Account</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">My memberships</h1>
        <p className="mt-2 text-sm text-stone-600">See what you&rsquo;re subscribed to, and how many sessions you have left this period.</p>
      </div>
      {memberships.length === 0 ? (
        <div className={ui.card}>
          <p className="font-medium text-stone-900">No memberships yet</p>
          <p className="mt-2 text-sm text-stone-600">
            Most studios offer a monthly membership on their page. If you&apos;re going regularly, it usually works out cheaper than paying per class.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {memberships.map((purchase) => {
            const sessionsRemaining =
              purchase.membership.sessionsPerPeriod == null ? null : Math.max(0, purchase.membership.sessionsPerPeriod - purchase.sessionsUsed);
            return (
              <article key={purchase.id} className={ui.card}>
                <p className="text-xs text-stone-500">{purchase.membership.studio.displayName}</p>
                <h2 className="mt-1 text-lg font-semibold text-amber-950">{purchase.membership.name}</h2>
                <p className="mt-2 text-sm text-stone-600">
                  {new Date(purchase.startsAt).toLocaleDateString()} → {new Date(purchase.expiresAt).toLocaleDateString()}
                </p>
                <p className="mt-1 text-sm text-stone-700">{humanMembershipStatus(purchase.status)}</p>
                <p className="mt-1 text-sm text-stone-700">
                  {sessionsRemaining != null
                    ? `${sessionsRemaining} ${sessionsRemaining === 1 ? "session" : "sessions"} left this period (${purchase.sessionsUsed} used)`
                    : `Unlimited sessions · ${purchase.sessionsUsed} used so far`}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
