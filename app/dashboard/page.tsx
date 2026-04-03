import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  if (user.role === "customer") {
    return (
      <div className="mx-auto max-w-lg">
        <p className={ui.overline}>Customer</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950">Your account</h1>
        <p className="mt-3 text-stone-600">
          Shop the marketplace, book classes, and manage checkout from your cart. Sign in keeps your session across
          devices.
        </p>
        <div className={`${ui.card} mt-8`}>
          <p className="text-sm font-medium text-stone-800">Start here</p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/marketplace" className={ui.buttonPrimary}>
              Browse the shop
            </Link>
            <Link href="/classes" className={ui.buttonSecondary}>
              Find a class
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
      <div className="mx-auto max-w-lg">
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

  return (
    <div className="mx-auto max-w-3xl">
      <p className={ui.overline}>Vendor</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">Studio dashboard</h1>
      <p className="mt-2 max-w-xl text-stone-600">
        Manage listings, classes, bookings, and payouts. Connect Stripe before taking live payments.
      </p>

      {studios.length === 0 ? (
        <div className={`${ui.cardMuted} mt-10`}>
          <h2 className="text-lg font-semibold text-amber-950">Create your studio</h2>
          <p className="mt-2 text-sm text-stone-600">
            Add your profile so we can review and approve you for the marketplace and class listings.
          </p>
          <Link href="/dashboard/studio/new" className={`${ui.buttonPrimary} mt-6 inline-flex`}>
            Start studio setup
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {studios.map((s) => {
            const stripeOk = s.stripeAccount?.chargesEnabled && s.stripeAccount?.payoutsEnabled;
            return (
              <li key={s.id} className={ui.card}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-stone-900">{s.displayName}</h2>
                    <p className="mt-1 text-sm text-stone-500 capitalize">Status: {s.status.replace(/_/g, " ")}</p>
                    <p className="mt-3 text-sm text-stone-600">
                      <span className="font-medium text-stone-800">Stripe:</span>{" "}
                      {stripeOk ? (
                        <span className="text-emerald-800">Connected</span>
                      ) : (
                        <span className="text-amber-900">Action needed — complete onboarding</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/studio/${s.id}`}
                    className={`${ui.buttonPrimary} shrink-0 text-center sm:w-auto`}
                  >
                    Manage studio
                  </Link>
                </div>
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
                  <Link href={`/dashboard/waitlist/${s.id}`} className="font-medium text-amber-900 hover:underline">
                    Waitlist
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
