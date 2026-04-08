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
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Settings</h1>
        <p className="mt-2 text-sm text-stone-600">
          Update how you appear to customers. Stripe Connect, activation, and legal checks stay in the studio workspace.
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

      <GoogleCalendarSettingsCard
        studioId={studioId}
        oauthConfigured={oauthConfigured}
        connectionStatus={calStatus}
        lastSyncAt={googleConn?.lastSyncAt?.toISOString() ?? null}
        syncErrorState={googleConn?.syncErrorState ?? null}
      />

      <VendorDomainsSettingsCard studioId={studioId} studioApproved={studio.status === "approved"} />

      <StudioSettingsClient
        key={studio.updatedAt.toISOString()}
        studioId={studioId}
        initial={{
          displayName: studio.displayName,
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
        }}
      />

      <div className={`${ui.card} space-y-4`}>
        <h2 className="text-lg font-semibold text-stone-900">Studio workspace</h2>
        <p className="text-sm text-stone-600">Legal entity, photos, activation fee, and Stripe onboarding.</p>
        <Link href={`/dashboard/studio/${studioId}`} className={ui.buttonSecondary}>
          Open full studio workspace
        </Link>
      </div>

      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-stone-900">Cancellation policies</h2>
        <p className="mt-2 text-sm text-stone-600">Create and attach policies from the class builder or API; list below is read-only.</p>
        <ul className="mt-4 space-y-2 text-sm text-stone-700">
          {policies.length === 0 ? <li className="text-stone-500">No studio-specific policies yet.</li> : null}
          {policies.map((p) => (
            <li key={p.id} className="rounded-lg bg-stone-50 px-3 py-2">
              <span className="font-medium">{p.name}</span> · {p.policyType}
            </li>
          ))}
        </ul>
      </div>

      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-stone-900">Blocked dates</h2>
        <p className="text-sm text-stone-600">
          Manage closed days from the{" "}
          <Link href={`/dashboard/experiences/${studioId}`} className="font-medium text-amber-900 underline">
            class builder
          </Link>{" "}
          (studio closed days section).
        </p>
      </div>
    </div>
  );
}
