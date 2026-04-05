"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type FeatureRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  preferenceOn: boolean;
  entitled: boolean;
  platformActive: boolean;
  includedForAll: boolean;
  requiresPaidSubscription: boolean;
};

type BundleRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  currency: string;
  listSumCents: number;
  requiresBundleStripe: boolean;
  featureSlugs: string[];
  featureNames: string[];
  allEntitled: boolean;
  hasGaps: boolean;
  needsIndividualStripeSlugs: string[];
};

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
}

export default function StudioFeaturesClient({ studioId }: { studioId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<FeatureRow[]>([]);
  const [bundles, setBundles] = useState<BundleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [syncNote, setSyncNote] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/studios/${studioId}/feature-requests`);
    const data = await res.json();
    if (res.ok) {
      if (Array.isArray(data.features)) setRows(data.features);
      if (Array.isArray(data.bundles)) setBundles(data.bundles);
    }
    setLoading(false);
  }, [studioId]);

  useEffect(() => {
    void load();
  }, [load]);

  const stripeFeatureSlug = searchParams.get("stripe_feature");
  useEffect(() => {
    if (!stripeFeatureSlug) return;
    setSyncNote("Confirming your subscription with the platform…");
    let n = 0;
    const id = setInterval(() => {
      void load();
      n += 1;
      if (n >= 6) {
        clearInterval(id);
        setSyncNote(null);
        router.replace(`/dashboard/${studioId}/features`, { scroll: false });
      }
    }, 1200);
    return () => clearInterval(id);
  }, [stripeFeatureSlug, load, router, studioId]);

  const stripeBundleSlug = searchParams.get("stripe_bundle");
  useEffect(() => {
    if (!stripeBundleSlug) return;
    setSyncNote("Confirming your bundle subscription…");
    let n = 0;
    const id = setInterval(() => {
      void load();
      n += 1;
      if (n >= 6) {
        clearInterval(id);
        setSyncNote(null);
        router.replace(`/dashboard/${studioId}/features`, { scroll: false });
      }
    }, 1200);
    return () => clearInterval(id);
  }, [stripeBundleSlug, load, router, studioId]);

  async function toggle(slug: string, next: boolean) {
    const row = rows.find((r) => r.slug === slug);
    const label = row?.name ?? slug;
    if (
      !next &&
      !confirm(
        row?.requiresPaidSubscription
          ? "Cancel this add-on? We will end the Stripe subscription immediately and access may stop right away."
          : "Turn off this add-on in your preferences?",
      )
    ) {
      return;
    }
    if (next) {
      const msg = row?.requiresPaidSubscription
        ? `Subscribe to “${label}”? You will be redirected to Stripe Checkout for a recurring monthly charge.`
        : `Enable “${label}” in your preferences?`;
      if (!confirm(msg)) return;
    }
    setPending(slug);
    const res = await fetch(`/api/studios/${studioId}/feature-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, active: next }),
    });
    const data = (await res.json()) as { checkoutUrl?: string; error?: string };
    setPending(null);
    if (typeof data.checkoutUrl === "string" && data.checkoutUrl.length) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (!res.ok) {
      window.alert(data.error ?? "Could not update this add-on.");
      return;
    }
    await load();
    if (slug === "kiln_tracking" || slug === "ai_advisor") router.refresh();
  }

  async function applyBundle(bundle: BundleRow) {
    if (bundle.allEntitled) return;
    const price = money(bundle.priceCents, bundle.currency);
    const list = money(bundle.listSumCents, bundle.currency);
    const stripePart = bundle.requiresBundleStripe
      ? `You will pay ${price}/mo via Stripe Checkout for the whole bundle (list if bought separately: ${list}/mo).`
      : bundle.needsIndividualStripeSlugs.length > 0
        ? `Free add-ons in the pack will turn on now. You will still need to subscribe individually for: ${bundle.needsIndividualStripeSlugs.join(", ")}.`
        : `Every add-on in this pack will be turned on now (no separate Stripe prices required).`;
    if (!confirm(`Enable “${bundle.name}”?\n\n${stripePart}`)) return;

    setPending(`bundle:${bundle.id}`);
    const res = await fetch(`/api/studios/${studioId}/feature-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bundleId: bundle.id }),
    });
    const data = (await res.json()) as {
      checkoutUrl?: string;
      error?: string;
      activatedSlugs?: string[];
      needsIndividualStripeSlugs?: string[];
      alreadyComplete?: boolean;
      message?: string;
    };
    setPending(null);
    if (typeof data.checkoutUrl === "string" && data.checkoutUrl.length) {
      window.location.href = data.checkoutUrl;
      return;
    }
    if (!res.ok) {
      window.alert(data.error ?? "Could not apply this bundle.");
      return;
    }
    if (data.alreadyComplete) {
      window.alert(data.message ?? "Already active.");
      await load();
      return;
    }
    await load();
    router.refresh();
    const bits: string[] = [];
    if (data.activatedSlugs?.length) bits.push(`Activated: ${data.activatedSlugs.join(", ")}`);
    if (data.needsIndividualStripeSlugs?.length) {
      bits.push(`Still need Stripe: ${data.needsIndividualStripeSlugs.join(", ")}`);
    }
    if (bits.length) window.alert(bits.join("\n"));
  }

  if (loading) return <p className="text-sm text-stone-500">Loading…</p>;

  if (!rows.length) {
    return (
      <p className="text-sm text-stone-600">
        No add-ons are configured yet. After the platform migration runs, catalog entries will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {syncNote ? <p className="text-sm font-medium text-amber-900">{syncNote}</p> : null}

      {bundles.length > 0 ? (
        <section>
          <h2 className="text-lg font-semibold text-amber-950">Bundles</h2>
          <p className="mt-1 text-sm text-stone-600">
            Save compared to turning add-ons on one by one. Cancelling any included add-on that shares a bundle
            subscription ends billing for the whole bundle.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {bundles.map((b) => {
              const busy = pending === `bundle:${b.id}`;
              const savingsPct =
                b.listSumCents > b.priceCents
                  ? Math.round(((b.listSumCents - b.priceCents) / b.listSumCents) * 100)
                  : 0;
              return (
                <div key={b.id} className={`${ui.card} border-amber-200/80 bg-amber-50/30`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-amber-950">{b.name}</p>
                      <p className="mt-2 text-sm text-stone-600">{b.description}</p>
                      <p className="mt-3 text-sm font-medium text-stone-800">
                        {money(b.priceCents, b.currency)}/mo
                        {b.listSumCents > 0 ? (
                          <span className="ml-2 text-xs font-normal text-stone-500">
                            vs {money(b.listSumCents, b.currency)} à la carte
                            {savingsPct > 0 ? (
                              <span className="ml-1 font-medium text-emerald-800">(~{savingsPct}%)</span>
                            ) : null}
                          </span>
                        ) : null}
                      </p>
                      {b.requiresBundleStripe ? (
                        <p className="mt-2 text-xs text-stone-600">
                          Billed as one Stripe subscription for the bundle.
                        </p>
                      ) : null}
                      <ul className="mt-2 list-inside list-disc text-xs text-stone-600">
                        {b.featureNames.map((n, i) => (
                          <li key={`${b.id}-f-${i}`}>{n}</li>
                        ))}
                      </ul>
                      {b.allEntitled ? (
                        <p className="mt-3 text-xs font-medium text-emerald-800">All add-ons in this bundle are active.</p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      disabled={busy || b.allEntitled}
                      onClick={() => void applyBundle(b)}
                      className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                        b.allEntitled
                          ? "cursor-not-allowed bg-stone-200 text-stone-500"
                          : "bg-amber-800 text-white hover:bg-amber-900"
                      }`}
                    >
                      {busy ? "…" : b.allEntitled ? "Active" : "Enable bundle"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="text-lg font-semibold text-amber-950">Individual add-ons</h2>
        <p className="mt-1 text-sm text-stone-600">Enable or disable each capability separately.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rows.map((f) => {
            const on = f.preferenceOn;
            const price = (f.priceCents / 100).toFixed(2);
            return (
              <div key={f.slug} className={ui.card}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-amber-950">{f.name}</p>
                    <p className="mt-2 text-sm text-stone-600">{f.description}</p>
                    <p className="mt-3 text-sm font-medium text-stone-800">
                      From {f.currency} {price}/mo{" "}
                      <span className="text-xs font-normal text-stone-500">
                        {f.requiresPaidSubscription ? "(Stripe)" : "(indicative)"}
                      </span>
                    </p>
                    {f.requiresPaidSubscription ? (
                      <p className="mt-2 text-xs text-stone-600">
                        This add-on is billed monthly via Stripe when enabled (platform catalog is not grant-all).
                      </p>
                    ) : null}
                    {!f.platformActive ? (
                      <p className="mt-2 text-xs font-medium text-amber-900">Temporarily unavailable on the platform.</p>
                    ) : null}
                    {f.includedForAll ? (
                      <p className="mt-2 text-xs text-stone-600">
                        Included for all studios today — you already have access. The toggle records your preference for when
                        billing goes live.
                      </p>
                    ) : null}
                    {!f.entitled && f.platformActive && !f.includedForAll ? (
                      <p className="mt-2 text-xs font-medium text-rose-800">
                        {f.requiresPaidSubscription
                          ? "Not subscribed — turn on below to open Stripe Checkout."
                          : "Not entitled — turn this on below."}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={pending === f.slug || !f.platformActive}
                    onClick={() => toggle(f.slug, !on)}
                    className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium ${
                      on ? "bg-emerald-700 text-white hover:bg-emerald-800" : "bg-stone-200 text-stone-800 hover:bg-stone-300"
                    }`}
                  >
                    {on ? "On" : "Off"}
                  </button>
                </div>
                {on ? (
                  <p className="mt-3 text-xs text-emerald-800">
                    {f.requiresPaidSubscription
                      ? "Active — managed in Stripe. Turn off to cancel the subscription."
                      : `Preference saved${f.includedForAll ? " — platform default still covers access today." : "."}`}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
