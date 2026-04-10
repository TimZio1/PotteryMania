import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { metaDashboardPage } from "@/lib/seo-routes";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";
import { DashboardRouteBreadcrumbs } from "@/components/dashboard/dashboard-route-breadcrumbs";
import { PlatformHeader } from "@/components/platform/platform-header";

export const metadata: Metadata = metaDashboardPage(
  "Dashboard",
  "/dashboard",
  "Manage your ceramic studio website: shop, bookings, branding, and Stripe payouts.",
);

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const showVerifyBanner =
    Boolean(session?.user?.email) && session?.user.emailVerified !== true;

  return (
    <div className="pm-visual-platform min-h-screen bg-zinc-950 text-zinc-100" data-pm-visual="platform">
      {showVerifyBanner && session?.user?.email ? (
        <EmailVerificationBanner email={session.user.email} />
      ) : null}
      <PlatformHeader variant="dashboard" />
      <DashboardRouteBreadcrumbs />
      <div className="mx-auto w-full max-w-none px-0 py-0 sm:px-0 sm:py-0">{children}</div>
    </div>
  );
}
