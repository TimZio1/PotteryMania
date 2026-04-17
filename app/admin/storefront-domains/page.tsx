import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { metaAdminPage } from "@/lib/seo-routes";
import {
  vendorDomainCanonicalOrigin,
  vendorDomainConnectTargetHostname,
  vendorDomainResolveFetchBaseUrl,
  vendorDomainSetupReady,
} from "@/lib/vendor-domain-core";

export const metadata: Metadata = metaAdminPage(
  "Storefront domains",
  "/admin/storefront-domains",
  "Operational checklist and live status for studio-owned storefront domains.",
);

export const dynamic = "force-dynamic";

function statusTone(ok: boolean) {
  return ok
    ? "border-emerald-200 bg-emerald-50 text-emerald-950"
    : "border-amber-200 bg-amber-50 text-amber-950";
}

export default async function AdminStorefrontDomainsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const connectTargetHostname = vendorDomainConnectTargetHostname();
  const canonicalOrigin = vendorDomainCanonicalOrigin();
  const resolveBaseUrl = vendorDomainResolveFetchBaseUrl();
  const setupReady = vendorDomainSetupReady();

  const domains = await prisma.vendorDomain.findMany({
    orderBy: [{ updatedAt: "desc" }],
    select: {
      id: true,
      domainName: true,
      domainType: true,
      verificationStatus: true,
      sslStatus: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      studio: {
        select: {
          id: true,
          displayName: true,
          status: true,
        },
      },
    },
    take: 200,
  });

  const totalDomains = domains.length;
  const activeDomains = domains.filter((domain) => domain.isActive && domain.verificationStatus === "verified").length;
  const pendingDomains = domains.filter((domain) => domain.verificationStatus !== "verified").length;

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Platform operator console</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Storefront domains</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted)] sm:text-base">
          One operational source of truth for studio-owned storefront domains: DNS target, routing readiness, canonical origin, and current domain inventory.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Setup ready</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{setupReady ? "Yes" : "No"}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">True only when target hostname, canonical origin, and resolve base URL are all available.</p>
        </article>
        <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Live storefront domains</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{activeDomains}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Verified + active studio domains currently eligible for host resolution.</p>
        </article>
        <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Pending domains</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{pendingDomains}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Domains added by studios but not yet fully verified.</p>
        </article>
        <article className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Tracked domains</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[var(--foreground)]">{totalDomains}</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Most recent 200 domain rows in the shared vendor-domain registry.</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Routing configuration</p>
          <div className="mt-5 space-y-3">
            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone(Boolean(connectTargetHostname))}`}>
              <p className="font-semibold">DNS target hostname</p>
              <p className="mt-1 break-all font-mono text-xs sm:text-sm">{connectTargetHostname ?? "Missing"}</p>
              <p className="mt-2 text-xs">
                Studios should point their chosen storefront hostname here using their provider&apos;s CNAME/ALIAS instructions.
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone(Boolean(canonicalOrigin))}`}>
              <p className="font-semibold">Canonical PotteryMania origin</p>
              <p className="mt-1 break-all font-mono text-xs sm:text-sm">{canonicalOrigin ?? "Missing"}</p>
              <p className="mt-2 text-xs">
                Booking, checkout, cart, and account flows redirect here from studio storefront domains.
              </p>
            </div>
            <div className={`rounded-2xl border px-4 py-3 text-sm ${statusTone(Boolean(resolveBaseUrl))}`}>
              <p className="font-semibold">Resolve API base URL</p>
              <p className="mt-1 break-all font-mono text-xs sm:text-sm">{resolveBaseUrl ?? "Missing"}</p>
              <p className="mt-2 text-xs">
                Edge middleware uses this origin to resolve incoming custom hosts to studio IDs.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Operator checklist</p>
          <ol className="mt-5 space-y-3 text-sm leading-6 text-[var(--foreground)]">
            <li>1. Set `NEXT_PUBLIC_SITE_URL` and `AUTH_URL` to the exact public PotteryMania origin.</li>
            <li>2. Set `INTERNAL_APP_ORIGIN` to the same primary HTTPS origin so middleware can call the resolve API reliably.</li>
            <li>3. Set `VENDOR_DOMAIN_RESOLVE_SECRET` so host resolution is not publicly callable without the shared secret header.</li>
            <li>4. Make sure your hosting platform accepts custom hostnames and provisions TLS for them.</li>
            <li>
              5. Tell studios to start with one exact hostname first, usually{" "}
              <code className="rounded bg-stone-100 px-1 py-0.5">www.theirstudio.com</code>, then add the apex later if needed.
            </li>
            <li>6. Have studios create both the TXT verification record and the provider-specific CNAME/ALIAS record to the target shown on this page.</li>
          </ol>
          <div className="mt-5 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
            <p className="font-semibold text-stone-900">Current product behavior</p>
            <p className="mt-1">
              The custom host serves the studio storefront home. Anything outside that storefront path, including cart and checkout, is sent back to the canonical PotteryMania origin.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Tracked domain inventory</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--foreground)]">Most recent storefront domains</h2>
          </div>
          <Link href="/admin/studios" className="text-sm font-medium text-amber-900 underline underline-offset-2">
            Open studios →
          </Link>
        </div>

        {domains.length === 0 ? (
          <p className="mt-5 text-sm text-[var(--muted)]">No studio storefront domains have been added yet.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
              <thead className="bg-stone-50 text-xs uppercase tracking-[0.12em] text-stone-500">
                <tr>
                  <th className="px-3 py-3 font-medium">Domain</th>
                  <th className="px-3 py-3 font-medium">Studio</th>
                  <th className="px-3 py-3 font-medium">Verification</th>
                  <th className="px-3 py-3 font-medium">SSL</th>
                  <th className="px-3 py-3 font-medium">Active</th>
                  <th className="px-3 py-3 font-medium">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {domains.map((domain) => (
                  <tr key={domain.id} className="align-top">
                    <td className="px-3 py-3 font-mono text-xs text-[var(--foreground)] sm:text-sm">{domain.domainName}</td>
                    <td className="px-3 py-3">
                      <div className="min-w-56">
                        <p className="font-medium text-stone-900">{domain.studio.displayName}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {domain.studio.status} · <Link href={`/admin/studios/${domain.studio.id}`} className="underline underline-offset-2">open studio</Link>
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--foreground)]">{domain.verificationStatus}</td>
                    <td className="px-3 py-3 text-[var(--foreground)]">{domain.sslStatus}</td>
                    <td className="px-3 py-3 text-[var(--foreground)]">{domain.isActive ? "Yes" : "No"}</td>
                    <td className="px-3 py-3 text-[var(--muted)]">{domain.updatedAt.toISOString().slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
