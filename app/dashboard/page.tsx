import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, requireAdminUser } from "@/lib/auth-session";
import { platformUi } from "@/lib/ui-styles";
import { metaDashboardPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaDashboardPage(
  "Studio control panel",
  "/dashboard",
  "Studio control panel for sessions, public pages, payments, and direct studio sales.",
);

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const adminSession = await requireAdminUser();
  if (adminSession) {
    redirect("/admin");
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  if (user.role === "customer") {
    return (
      <div className="mx-auto max-w-lg px-(--pm-space-4) py-(--pm-space-8) sm:px-(--pm-space-6) sm:py-(--pm-space-10)">
        <p className={platformUi.overline}>Account</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)]">Start your studio workspace</h1>
        <p className="mt-3 text-[var(--muted)]">
          Create your studio, manage your account, or review upcoming sessions from one place.
        </p>
        <div className={`${platformUi.card} mt-8`}>
          <p className="text-sm font-medium text-stone-900">Start here</p>
          <div className="mt-4 flex flex-col gap-3">
            <Link href="/dashboard/studio/new?setup=both" className={platformUi.buttonPrimary}>
              Create your studio
            </Link>
            <Link href="/dashboard/studio/new?setup=both" className={platformUi.buttonSecondary}>
              Guided setup
            </Link>
            <Link href="/dashboard/billing" className={`${platformUi.buttonGhost} justify-center`}>
              Workspace billing
            </Link>
            <Link href="/my-bookings" className={`${platformUi.buttonGhost} justify-center`}>
              My bookings &amp; sessions
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "vendor") {
    return (
      <div className="mx-auto max-w-lg px-(--pm-space-4) py-(--pm-space-8) sm:px-(--pm-space-6) sm:py-(--pm-space-10)">
        <h1 className="text-xl font-semibold text-[var(--foreground)]">Studio control panel</h1>
        <p className="mt-3 text-[var(--muted)]">
          This workspace is for studio operators. Public discovery and booking pages stay on the main site.
        </p>
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
  const latestStudio = studios[0] ?? null;

  return (
    <div className="mx-auto max-w-3xl px-(--pm-space-4) py-(--pm-space-8) sm:px-(--pm-space-6) sm:py-(--pm-space-10)">
      <div className="flex flex-wrap items-center gap-3">
        <p className={platformUi.overline}>Studios</p>
      </div>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-3xl">Studio control panel</h1>
      <p className="mt-2 max-w-xl text-[var(--muted)]">
        Run sessions, studio sales, public pages, and payouts from one place.
      </p>

      {latestStudio ? (
        <div className={`${platformUi.card} mt-8`}>
          <p className="text-sm font-medium text-stone-900">Subscriptions, packs & add-ons</p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Buy feature packs, start add-on subscriptions, or review workspace billing for your studio workspace.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href={`/dashboard/${latestStudio.id}/features`} className={platformUi.buttonPrimary}>
              Buy packs & add-ons
            </Link>
            <Link href="/dashboard/billing" className={platformUi.buttonSecondary}>
              Open workspace billing
            </Link>
          </div>
        </div>
      ) : null}

      {studios.length === 0 ? (
        <div className={`${platformUi.cardMuted} mt-10`}>
          <h2 className="text-lg font-semibold text-[var(--foreground)]">Create your studio</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Start with studio basics, add your first experience or product, preview your page, and activate advanced features
            whenever you are ready.
          </p>
          <Link href="/dashboard/studio/new?setup=both" className={`${platformUi.buttonPrimary} mt-6 inline-flex`}>
            Create your studio
          </Link>
        </div>
      ) : (
        <ul className="mt-10 space-y-4">
          {studios.map((s) => {
            const stripeOk = s.stripeAccount?.chargesEnabled && s.stripeAccount?.payoutsEnabled;
            const activated = !!s.activationPaidAt;
            return (
              <li key={s.id} className={platformUi.card}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-[var(--foreground)]">{s.displayName}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)] capitalize">Status: {s.status.replace(/_/g, " ")}</p>

                    <p className="mt-3 text-sm text-[var(--muted)]">
                      <span className="font-medium text-stone-900">Direct payments:</span>{" "}
                      {activated ? (
                        <span className="text-emerald-700">Live</span>
                      ) : (
                        <span className="text-amber-800">Not live yet — connect payouts to activate direct bookings and sales</span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-[var(--muted)]">
                      <span className="font-medium text-stone-900">Payouts:</span>{" "}
                      {stripeOk ? (
                        <span className="text-emerald-700">Connected</span>
                      ) : (
                        <span className="text-amber-800">Action needed — complete Stripe setup</span>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                    <Link href={`/dashboard/${s.id}/guided`} className={`${platformUi.buttonPrimary} text-center sm:w-auto`}>
                      Guided setup
                    </Link>
                    <Link
                      href={`/dashboard/${s.id}`}
                      className={`${platformUi.buttonSecondary} text-center sm:w-auto`}
                    >
                      Open control panel
                    </Link>
                    <Link
                      href={`/dashboard/studio/${s.id}`}
                      className="text-center text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
                    >
                      Studio details &amp; payouts
                    </Link>
                    <Link
                      href={`/dashboard/${s.id}/features`}
                      className="text-center text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
                    >
                      Packs, subscriptions &amp; add-ons
                    </Link>
                    <Link
                      href={`/dashboard/${s.id}/settings`}
                      className="text-center text-xs text-[var(--muted)] underline hover:text-[var(--foreground)]"
                    >
                      Storefront domain
                    </Link>
                  </div>
                </div>
                {activated ? (
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-stone-200/80 pt-4 text-sm">
                    <Link href={`/dashboard/${s.id}/schedule/sessions`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Sessions
                    </Link>
                    <Link href={`/dashboard/${s.id}/programs`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Programs
                    </Link>
                    <Link href={`/dashboard/${s.id}/commerce/catalog`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Catalog
                    </Link>
                    <Link href={`/dashboard/${s.id}/money/overview`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Money
                    </Link>
                    <Link href={`/dashboard/${s.id}/guests`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Guests
                    </Link>
                    <Link href={`/dashboard/${s.id}/money/reports`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Reports
                    </Link>
                    <Link href={`/dashboard/${s.id}/features`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Packs & add-ons
                    </Link>
                    <Link href={`/studios/${s.id}`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Public page
                    </Link>
                    <Link href={`/dashboard/${s.id}/settings`} className="font-medium text-[var(--foreground)] hover:text-[var(--foreground)] hover:underline">
                      Storefront domain
                    </Link>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
