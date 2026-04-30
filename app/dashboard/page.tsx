import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, requireAdminUser } from "@/lib/auth-session";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { platformUi } from "@/lib/ui-styles";
import { metaDashboardPage } from "@/lib/seo-routes";
import { getUserAffiliatePrograms } from "@/lib/wear-user-affiliate-dashboard";
import {
  DashboardUserAffiliateSection,
  DashboardVendorStudioAffiliateHint,
} from "@/components/dashboard/dashboard-user-affiliate-section";

export async function generateMetadata(): Promise<Metadata> {
  if (isApparelOnlyLaunch()) {
    return metaDashboardPage(
      "Your account",
      "/dashboard",
      "The apparel drop, your orders, and partner tools — tees and hoodies only.",
    );
  }
  return metaDashboardPage(
    "Your studios",
    "/dashboard",
    "Open a studio to run classes, your shop, and payouts.",
  );
}

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const adminSession = await requireAdminUser();
  if (adminSession) {
    redirect("/admin");
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const apparelOnly = isApparelOnlyLaunch();
  const affiliatePrograms = await getUserAffiliatePrograms(user.id);
  const affiliateByStudioId = new Map(affiliatePrograms.map((r) => [r.studioId, r]));

  if (user.role === "customer") {
    const maxW = affiliatePrograms.length > 0 ? "max-w-2xl" : "max-w-lg";
    return (
      <div
        className={`mx-auto ${maxW} px-(--pm-space-4) py-(--pm-space-8) sm:px-(--pm-space-6) sm:py-(--pm-space-10)`}
      >
        <p className={platformUi.overline}>Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Your account</h1>
        <p className="mt-3 text-[var(--muted)]">
          {apparelOnly
            ? "Shop the drop, track wear orders, or create a studio when you’re ready to sell with us."
            : "Track apparel orders or open your studio."}
        </p>
        <div className={`${platformUi.card} mt-8`}>
          <div className="flex flex-col gap-3">
            <Link href="/wear/shop" className={platformUi.buttonPrimary}>
              Shop the drop
            </Link>
            <Link href="/my-orders" className={platformUi.buttonSecondary}>
              Orders
            </Link>
            <Link href="/dashboard/studio/new?setup=both" className={platformUi.buttonSecondary}>
              Create my studio
            </Link>
            <Link href="/dashboard/billing" className={`${platformUi.buttonGhost} justify-center`}>
              Billing
            </Link>
          </div>
        </div>
        <DashboardUserAffiliateSection rows={affiliatePrograms} />
      </div>
    );
  }

  if (user.role !== "vendor") {
    return (
      <div className="mx-auto max-w-lg px-(--pm-space-4) py-(--pm-space-8) sm:px-(--pm-space-6) sm:py-(--pm-space-10)">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Studios</h1>
        <p className="mt-3 text-[var(--muted)]">This area is for studio owners.</p>
        <Link href="/" className={`${platformUi.buttonSecondary} mt-6 inline-flex`}>
          Back to home
        </Link>
      </div>
    );
  }

  const studios = await prisma.studio.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { stripeAccount: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-(--pm-space-4) py-(--pm-space-8) sm:px-(--pm-space-6) sm:py-(--pm-space-10)">
      <div className="flex flex-wrap items-center gap-3">
        <p className={platformUi.overline}>Studios</p>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Your studios</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        {apparelOnly
          ? "Pick a studio to manage partner links, payouts, and tools tied to your brand on the drop."
          : "Pick a studio to manage classes, shop, and money."}
      </p>

      {studios.length === 0 ? (
        <div className={`${platformUi.cardMuted} mt-10`}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Start your first studio</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {apparelOnly
              ? "Name it, connect payouts, and share your page — apparel storefront first."
              : "Name it, add a class or product, share your page."}
          </p>
          <Link href="/dashboard/studio/new?setup=both" className={`${platformUi.buttonPrimary} mt-6 inline-flex`}>
            Create my studio
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {studios.map((s) => {
            const stripeOk = s.stripeAccount?.chargesEnabled && s.stripeAccount?.payoutsEnabled;
            const activated = !!s.activationPaidAt;
            const affiliateRow = affiliateByStudioId.get(s.id);
            return (
              <li key={s.id} className={platformUi.card}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">{s.displayName}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)] capitalize">Status: {s.status.replace(/_/g, " ")}</p>
                    {affiliateRow ? <DashboardVendorStudioAffiliateHint row={affiliateRow} /> : null}

                    <p className="mt-3 text-sm text-[var(--muted)]">
                      <span className="font-medium text-stone-900">Ready to get paid:</span>{" "}
                      {activated ? (
                        <span className="text-emerald-700">Yes</span>
                      ) : (
                        <span className="text-amber-800">Not yet — connect your bank first</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      <span className="font-medium text-stone-900">Bank linked:</span>{" "}
                      {stripeOk ? (
                        <span className="text-emerald-700">Yes</span>
                      ) : (
                        <span className="text-amber-800">Not yet — finish bank setup</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <Link href={`/dashboard/${s.id}`} className={`${platformUi.buttonPrimary} text-center sm:w-auto`}>
                      Open studio
                    </Link>
                    <Link
                      href={`/dashboard/${s.id}/guided`}
                      className={`${platformUi.buttonSecondary} text-center sm:w-auto`}
                    >
                      Simple setup
                    </Link>
                    <Link
                      href={`/studios/${s.id}`}
                      className="text-center text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      View public page
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
