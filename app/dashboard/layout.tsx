import type { Metadata } from "next";
import type { ReactNode } from "react";
import { auth } from "@/auth";
import { isApparelOnlyLaunch } from "@/lib/launch-mode";
import { metaDashboardPage } from "@/lib/seo-routes";
import { EmailVerificationBanner } from "@/components/dashboard/email-verification-banner";
import { DashboardRouteBreadcrumbs } from "@/components/dashboard/dashboard-route-breadcrumbs";
import { PlatformHeader } from "@/components/platform/platform-header";

export async function generateMetadata(): Promise<Metadata> {
  if (isApparelOnlyLaunch()) {
    return metaDashboardPage(
      "Account & studio",
      "/dashboard",
      "Shop the apparel drop, track orders, billing, and your studio tools when you sell with PotteryMania.",
    );
  }
  return metaDashboardPage(
    "Studio control panel",
    "/dashboard",
    "Studio control panel for sessions, public pages, payments, and direct studio sales.",
  );
}

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  const showVerifyBanner =
    Boolean(session?.user?.email) && session?.user.emailVerified !== true;

  return (
    <div className="pm-visual-platform min-h-screen" data-pm-visual="platform">
      {showVerifyBanner && session?.user?.email ? (
        <EmailVerificationBanner email={session.user.email} />
      ) : null}
      <PlatformHeader variant="dashboard" />
      <DashboardRouteBreadcrumbs />
      <div className="mx-auto w-full max-w-none px-0 py-0 sm:px-0 sm:py-0">{children}</div>
    </div>
  );
}
