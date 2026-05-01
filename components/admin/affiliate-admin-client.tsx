"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";
import { formatWearMoney } from "@/lib/wear-money";

export type AdminAffiliateRow = {
  studioId: string;
  name: string;
  email: string;
  code: string | null;
  enabled: boolean;
  marginPercent: string;
  salesCount: number;
  revenueCents: number;
  commissionCents: number;
  unpaidCommissionCents: number;
  paidCommissionCents: number;
  failedPayoutCents: number;
  stripeStatus: string;
  lastSaleAt: string | null;
};

type Props = {
  affiliates: AdminAffiliateRow[];
  siteUrl: string;
};

function codeUrl(siteUrl: string, code: string | null) {
  return code ? `${siteUrl.replace(/\/$/, "")}/w/${code}` : "";
}

function formatDate(iso: string | null) {
  if (!iso) return "No sales yet";
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function AffiliateAdminClient({ affiliates, siteUrl }: Props) {
  const [rows, setRows] = useState(affiliates);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    email: "",
    code: "",
    marginPercent: "15",
    enabled: true,
  });

  async function createAffiliate() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/affiliates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof json.error === "string" ? json.error : "Could not create affiliate.");
        return;
      }
      if (typeof json.stripeOnboardingUrl === "string" && json.stripeOnboardingUrl.length > 0) {
        await navigator.clipboard?.writeText(json.stripeOnboardingUrl).catch(() => undefined);
        setMessage("Affiliate created. Stripe onboarding link copied; send it to the affiliate.");
        setTimeout(() => window.location.reload(), 1200);
        return;
      }
      setMessage("Affiliate created. Refreshing list...");
      window.location.reload();
    } finally {
      setBusy(false);
    }
  }

  async function updateAffiliate(row: AdminAffiliateRow) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/affiliates/${row.studioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.name,
          email: row.email,
          code: row.code,
          marginPercent: row.marginPercent,
          enabled: row.enabled,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof json.error === "string" ? json.error : "Could not update affiliate.");
        return;
      }
      setMessage("Affiliate saved.");
    } finally {
      setBusy(false);
    }
  }

  async function createStripeOnboarding(row: AdminAffiliateRow) {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch(`/api/admin/affiliates/${row.studioId}/stripe`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof json.error === "string" ? json.error : "Could not create Stripe onboarding link.");
        return;
      }
      if (typeof json.onboardingUrl === "string" && json.onboardingUrl.length > 0) {
        await navigator.clipboard?.writeText(json.onboardingUrl).catch(() => undefined);
        setMessage("Stripe onboarding link copied. Send it to the affiliate so payouts can be enabled.");
      } else {
        setMessage("Affiliate Stripe account is payout-ready.");
      }
      patchRow(row.studioId, {
        stripeStatus: json.stripe?.payoutsEnabled ? "ready" : (json.stripe?.onboardingStatus ?? row.stripeStatus),
      });
    } finally {
      setBusy(false);
    }
  }

  function patchRow(studioId: string, patch: Partial<AdminAffiliateRow>) {
    setRows((current) => current.map((row) => (row.studioId === studioId ? { ...row, ...patch } : row)));
  }

  return (
    <div className="space-y-8">
      {message ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {message}
        </div>
      ) : null}

      <section className={ui.card}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Create affiliate</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">Issue a tracked link</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-stone-600">
            Default: 15% commission on final paid merchandise after discounts. Payouts transfer to the affiliate Stripe
            account once unpaid commission reaches €50.
          </p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-5">
          <label className="md:col-span-1">
            <span className={ui.label}>Name</span>
            <input
              className={`${ui.input} mt-1.5`}
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Creator name"
            />
          </label>
          <label className="md:col-span-1">
            <span className={ui.label}>Email</span>
            <input
              className={`${ui.input} mt-1.5`}
              value={draft.email}
              onChange={(e) => setDraft((d) => ({ ...d, email: e.target.value }))}
              placeholder="creator@example.com"
            />
          </label>
          <label>
            <span className={ui.label}>Code</span>
            <input
              className={`${ui.input} mt-1.5`}
              value={draft.code}
              onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value }))}
              placeholder="creator-code"
            />
          </label>
          <label>
            <span className={ui.label}>Commission %</span>
            <input
              className={`${ui.input} mt-1.5`}
              value={draft.marginPercent}
              onChange={(e) => setDraft((d) => ({ ...d, marginPercent: e.target.value }))}
              inputMode="decimal"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={createAffiliate}
            className={`${ui.buttonPrimary} mt-6 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            Create affiliate
          </button>
        </div>
      </section>

      <section className={ui.card}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Affiliates</p>
            <h2 className="mt-2 text-xl font-semibold tracking-tight text-stone-950">Codes, sales, and commission</h2>
          </div>
          <p className="text-sm text-stone-600">{rows.length} affiliate{rows.length === 1 ? "" : "s"}</p>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-[1280px] w-full border-separate border-spacing-y-3 text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.14em] text-stone-500">
              <tr>
                <th className="px-3">Affiliate</th>
                <th className="px-3">Code / link</th>
                <th className="px-3">Rate</th>
                <th className="px-3">Status</th>
                <th className="px-3">Sales</th>
                <th className="px-3">Commission / payouts</th>
                <th className="px-3">Stripe</th>
                <th className="px-3">Last sale</th>
                <th className="px-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.studioId} className="rounded-2xl bg-stone-50 align-top">
                  <td className="rounded-l-2xl px-3 py-3">
                    <input
                      className={ui.input}
                      value={row.name}
                      onChange={(e) => patchRow(row.studioId, { name: e.target.value })}
                    />
                    <input
                      className={`${ui.input} mt-2`}
                      value={row.email}
                      onChange={(e) => patchRow(row.studioId, { email: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={ui.input}
                      value={row.code ?? ""}
                      onChange={(e) => patchRow(row.studioId, { code: e.target.value })}
                    />
                    {row.code ? (
                      <a
                        href={codeUrl(siteUrl, row.code)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 block max-w-[260px] truncate text-xs font-medium text-amber-900 underline"
                      >
                        {codeUrl(siteUrl, row.code)}
                      </a>
                    ) : (
                      <p className="mt-2 text-xs text-stone-500">No public code</p>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <input
                      className={`${ui.input} w-24`}
                      value={row.marginPercent}
                      onChange={(e) => patchRow(row.studioId, { marginPercent: e.target.value })}
                      inputMode="decimal"
                    />
                  </td>
                  <td className="px-3 py-3">
                    <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={row.enabled}
                        onChange={(e) => patchRow(row.studioId, { enabled: e.target.checked })}
                      />
                      {row.enabled ? "Active" : "Paused"}
                    </label>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-stone-950">{row.salesCount}</p>
                    <p className="text-xs text-stone-500">{formatWearMoney(row.revenueCents, "EUR")} revenue</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-emerald-800">{formatWearMoney(row.commissionCents, "EUR")} earned</p>
                    <p className="text-xs text-stone-500">{formatWearMoney(row.unpaidCommissionCents, "EUR")} unpaid</p>
                    <p className="text-xs text-stone-500">{formatWearMoney(row.paidCommissionCents, "EUR")} paid</p>
                    {row.failedPayoutCents > 0 ? (
                      <p className="text-xs font-semibold text-red-700">{formatWearMoney(row.failedPayoutCents, "EUR")} failed</p>
                    ) : null}
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">
                      {row.stripeStatus === "ready" ? "Payout ready" : row.stripeStatus}
                    </p>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => createStripeOnboarding(row)}
                      className="mt-2 text-xs font-semibold text-amber-900 underline disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {row.stripeStatus === "ready" ? "Sync Stripe" : "Copy onboarding link"}
                    </button>
                  </td>
                  <td className="px-3 py-3 text-stone-600">{formatDate(row.lastSaleAt)}</td>
                  <td className="rounded-r-2xl px-3 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => updateAffiliate(row)}
                      className={`${ui.buttonSecondary} disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      Save
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
                    No affiliates yet. Create the first one above.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
