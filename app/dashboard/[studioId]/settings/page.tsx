import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import StudioSettingsClient from "@/components/dashboard/studio-settings-client";
import GoogleCalendarSettingsCard from "@/components/dashboard/google-calendar-settings-card";
import VendorDomainsSettingsCard from "@/components/dashboard/vendor-domains-settings-card";
import { googleCalendarOAuthConfigured } from "@/lib/calendar/google-oauth";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { parsePublicServiceModes } from "@/lib/studio-public-service-modes";
import StudioPublicServicesClient from "@/components/dashboard/studio-public-services-client";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ studioId: string }>;
  searchParams: Promise<{ calendar_connected?: string; calendar_error?: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Studio settings", "settings", "Profile, integrations, and studio preferences.");
}

export default async function StudioSettingsPage({ params, searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const sp = await searchParams;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const googleConn = await prisma.calendarConnection.findFirst({
    where: { studioId, provider: "google" },
    orderBy: { updatedAt: "desc" },
  });
  const oauthConfigured = googleCalendarOAuthConfigured();
  let calStatus: "none" | "connected" | "error" | "disconnected" | "pending" = "none";
  if (googleConn) {
    calStatus =
      googleConn.connectionStatus === "connected"
        ? "connected"
        : googleConn.connectionStatus === "error"
          ? "error"
          : googleConn.connectionStatus === "pending"
            ? "pending"
            : "disconnected";
  }

  const policies = await prisma.cancellationPolicy.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className={ui.overline}>Configuration</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Settings</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Update how your studio appears to guests. Payout setup and legal profile details stay in the studio workspace.
        </p>
      </div>

      {sp.calendar_connected ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          Google Calendar connected. New confirmed bookings will sync automatically.
        </p>
      ) : null}
      {sp.calendar_error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
          Calendar: {sp.calendar_error}
        </p>
      ) : null}

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-stone-900">Settings</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Profile, your page, schedule, and payouts.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Link href={`/dashboard/${studioId}/site/page`} className={ui.buttonSecondary}>
            Studio page
          </Link>
          <Link href={`/dashboard/${studioId}/schedule/calendar`} className={ui.buttonSecondary}>
            Schedule
          </Link>
          <Link href={`/dashboard/${studioId}/money/overview`} className={ui.buttonSecondary}>
            Earnings
          </Link>
          <Link href={`/dashboard/studio/${studioId}`} className={ui.buttonSecondary}>
            Business & bank (Stripe)
          </Link>
        </div>
        <div className="mt-5 border-t border-stone-200 pt-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">More tools</p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Deeper options live here so the sidebar stays short.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <Link href={`/dashboard/${studioId}/site/integrations`} className={ui.buttonGhost}>
              Web integrations
            </Link>
            <Link href={`/dashboard/${studioId}/packages`} className={ui.buttonGhost}>
              Class packages
            </Link>
            <Link href={`/dashboard/${studioId}/memberships`} className={ui.buttonGhost}>
              Membership plans
            </Link>
            <Link href={`/dashboard/${studioId}/locations`} className={ui.buttonGhost}>
              Studio locations
            </Link>
            <Link href={`/dashboard/${studioId}/client-fields`} className={ui.buttonGhost}>
              Client profile fields
            </Link>
            <Link href={`/dashboard/${studioId}/intake-forms`} className={ui.buttonGhost}>
              Booking questions
            </Link>
            <Link href={`/dashboard/${studioId}/wearables`} className={ui.buttonGhost}>
              Wearables
            </Link>
            <Link href={`/dashboard/${studioId}/promotions`} className={ui.buttonGhost}>
              Promotions
            </Link>
          </div>
        </div>
      </section>

      <GoogleCalendarSettingsCard
        studioId={studioId}
        oauthConfigured={oauthConfigured}
        connectionStatus={calStatus}
        lastSyncAt={googleConn?.lastSyncAt?.toISOString() ?? null}
        syncErrorState={googleConn?.syncErrorState ?? null}
        syncEnabled={googleConn?.syncEnabled !== false}
        hasGoogleConnection={Boolean(googleConn)}
      />

      <VendorDomainsSettingsCard studioId={studioId} studioApproved={studio.status === "approved"} />

      <StudioPublicServicesClient
        key={`svc-${studio.updatedAt.toISOString()}`}
        studioId={studioId}
        initial={parsePublicServiceModes(studio.publicServiceModes)}
      />

      <StudioSettingsClient
        key={studio.updatedAt.toISOString()}
        studioId={studioId}
        initial={{
          displayName: studio.displayName,
          ianaTimezone: studio.ianaTimezone,
          shortDescription: studio.shortDescription,
          longDescription: studio.longDescription,
          email: studio.email,
          phone: studio.phone,
          city: studio.city,
          country: studio.country,
          addressLine1: studio.addressLine1,
          addressLine2: studio.addressLine2,
          postalCode: studio.postalCode,
          websiteUrl: studio.websiteUrl,
          instagramUrl: studio.instagramUrl,
          facebookUrl: studio.facebookUrl,
          whatsappNumber: studio.whatsappNumber,
          openingHours: studio.openingHours as { day: string; from: string; to: string; closed: boolean }[] | null,
          supportedLanguages: studio.supportedLanguages,
        }}
      />

      <div className={`${ui.card} space-y-4`}>
        <h2 className="text-lg font-semibold text-stone-900">Studio workspace</h2>
        <p className="text-sm text-[var(--muted)]">Legal entity, photos, and Stripe onboarding.</p>
        <Link href={`/dashboard/studio/${studioId}`} className={ui.buttonSecondary}>
          Open full studio workspace
        </Link>
      </div>

      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-stone-900">Cancellation policies</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Create and attach policies from the class builder or API; list below is read-only.</p>
        <ul className="mt-4 space-y-2 text-sm text-[var(--foreground)]">
          {policies.length === 0 ? <li className="text-[var(--muted)]">No studio-specific policies yet.</li> : null}
          {policies.map((p) => (
            <li key={p.id} className="rounded-lg bg-stone-50 px-3 py-2">
              <span className="font-medium">{p.name}</span> · {p.policyType}
            </li>
          ))}
        </ul>
      </div>

      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-stone-900">Blocked dates</h2>
        <p className="text-sm text-[var(--muted)]">
          Block specific days when your studio is closed (holidays, maintenance, etc.).
        </p>
        <Link href={`/dashboard/${studioId}/programs/planner`} className={`${ui.buttonSecondary} mt-3 inline-flex`}>
          Open class planner &amp; closed days
        </Link>
      </div>
    </div>
  );
}
