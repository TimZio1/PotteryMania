import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, requireAdminUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { metaDashboardPage } from "@/lib/seo-routes";
import { getStudioIdsWithUpgradeMomentum, UPGRADE_MOMENTUM_MESSAGE } from "@/lib/upgrade-momentum";

export const metadata: Metadata = metaDashboardPage(
  "Studio dashboard",
  "/dashboard",
  "Your studio websites, activation, Stripe Connect, and quick links to bookings and shop.",
);

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const adminSession = await requireAdminUser();
  if (adminSession) {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
        <p className={ui.overline}>Admin</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950">Operations</h1>
        <p className="mt-3 text-stone-600">
          Open the hyperadmin panel to review studios, bookings, commissions, and finance tooling.
        </p>
        <div className={`${ui.card} mt-8 space-y-3`}>
          <Link href="/admin" className={`${ui.buttonPrimary} block w-full text-center`}>
            Open hyperadmin panel
          </Link>
          <Link href="/admin/finance" className={`${ui.buttonSecondary} block w-full text-center`}>
            Financial engine
          </Link>
        </div>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  if (user.role === "customer") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
        <p className={ui.overline}>Customer</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950">Your account</h1>
        <p className="mt-3 text-stone-600">
          Manage your account and studio setup. Sign in keeps your session across devices.
        </p>
        <div className={`${ui.card} mt-8`}>
          <p className="text-sm font-medium text-stone-800">Start here</p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/dashboard/studio/new?setup=both" className={ui.buttonPrimary}>
              Create my studio website
            </Link>
            <Link href="/dashboard/studio/new?setup=both" className={ui.buttonSecondary}>
              Studio setup
            </Link>
            <Link href="/dashboard/billing" className={`${ui.buttonGhost} justify-center`}>
              Studio plans & billing
            </Link>
            <Link href="/my-bookings" className={`${ui.buttonGhost} justify-center`}>
              My bookings
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "vendor") {
    return (
      <div className="mx-auto max-w-lg px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="text-xl font-semibold text-amber-950">Dashboard</h1>
        <p className="mt-3 text-stone-600">This area is for studio vendors. Use the main site to browse as a customer.</p>
        <Link href="/" className={`${ui.buttonSecondary} mt-6 inline-flex`}>
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

  const momentumIds = await getStudioIdsWithUpgradeMomentum(studios.map((s) => s.id));
  const showUpgradeNudge = momentumIds.size > 0;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-center gap-3">
        <p className={ui.overline}>Vendor</p>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">Studio dashboard</h1>
      <p className="mt-2 max-w-xl text-stone-600">
        Manage your website, classes, shop, and payouts. Connect Stripe before taking live payments.
      </p>

      {showUpgradeNudge ? (
        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950 shadow-sm sm:px-5">
          <p className="font-semibold">{UPGRADE_MOMENTUM_MESSAGE}</p>
          <p className="mt-2 text-amber-900/90">
            You&apos;ve crossed real usage signals (bookings, catalog, or paid orders). Lock in the plan that matches how
            you operate — add-ons and billing live in one place.
          </p>
          <Link href="/dashboard/billing" className="mt-3 inline-flex font-semibold text-amber-950 underline underline-offset-2">
            View plans &amp; billing →
          </Link>
        </div>
      ) : null}

      {studios.length === 0 ? (
        <div className={`${ui.cardMuted} mt-10`}>
          <h2 className="text-lg font-semibold text-amber-950">Create your studio</h2>
          <p className="mt-2 text-sm text-stone-600">
            Add your profile, choose a plan path (bookings, shop, or both), connect Stripe, and go live immediately.
          </p>
          <Link href="/dashboard/studio/new?setup=both" className={`${ui.buttonPrimary} mt-6 inline-flex`}>
            Start website setup
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {studios.map((s) => {
            const stripeOk = s.stripeAccount?.chargesEnabled && s.stripeAccount?.payoutsEnabled;
            const activated = !!s.activationPaidAt;
            return (
              <li key={s.id} className={ui.card}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">{s.displayName}</h2>
                    <p className="mt-1 text-sm text-stone-500 capitalize">Status: {s.status.replace(/_/g, " ")}</p>

                    <p className="mt-3 text-sm text-stone-600">
                      <span className="font-medium text-stone-800">Commerce:</span>{" "}
                      {activated ? (
                        <span className="text-emerald-800">Active</span>
                      ) : (
                        <span className="text-amber-900">Pending — connect Stripe to activate</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-stone-600">
                      <span className="font-medium text-stone-800">Stripe:</span>{" "}
                      {stripeOk ? (
                        <span className="text-emerald-800">Connected</span>
                      ) : (
                        <span className="text-amber-900">Action needed — complete onboarding</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <Link href={`/dashboard/${s.id}`} className={`${ui.buttonPrimary} text-center sm:w-auto`}>
                      Open studio panel
                    </Link>
                    <Link
                      href={`/dashboard/studio/${s.id}`}
                      className="text-center text-xs text-stone-500 underline hover:text-amber-900"
                    >
                      Studio profile &amp; Stripe
                    </Link>
                  </div>
                </div>
                      {activated && (
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-100 pt-4 text-sm">
                    <Link href={`/dashboard/products/${s.id}`} className="font-medium text-amber-900 hover:underline">
                      Products
                    </Link>
                    <Link href={`/dashboard/experiences/${s.id}`} className="font-medium text-amber-900 hover:underline">
                      Experiences
                    </Link>
                    <Link href={`/dashboard/bookings/${s.id}`} className="font-medium text-amber-900 hover:underline">
                      Bookings
                    </Link>
                    <Link href={`/dashboard/orders/${s.id}`} className="font-medium text-amber-900 hover:underline">
                      Orders
                    </Link>
                    <Link href={`/dashboard/analytics/${s.id}`} className="font-medium text-amber-900 hover:underline">
                      Analytics
                    </Link>
                    <Link href={`/dashboard/referrals/${s.id}`} className="font-medium text-amber-900 hover:underline">
                      Referrals
                    </Link>
                    <Link href={`/dashboard/waitlist/${s.id}`} className="font-medium text-amber-900 hover:underline">
                      Class waitlist
                    </Link>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
