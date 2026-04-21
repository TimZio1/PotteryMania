"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ui } from "@/lib/ui-styles";
import {
  CLASS_LENGTHS,
  flowSummaryLabel,
  parseFlow,
  SCHEDULE_PRESETS,
  SELL_TYPES,
  type Flow,
} from "@/components/guided/guided-app-constants";

type GuidedResume = { flow: Exclude<Flow, null>; step: number; at: number };

function ProgressDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="mb-8 flex justify-center gap-2" role="status" aria-label={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-2.5 w-2.5 rounded-full transition ${i < step ? "bg-amber-700" : "bg-stone-200"}`}
        />
      ))}
    </div>
  );
}

export function GuidedApp({
  studioId,
  initialDisplayName,
  initialShortDescription,
}: {
  studioId: string;
  initialDisplayName: string;
  initialShortDescription: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const flow = parseFlow(searchParams.get("flow"));
  const step = Math.max(1, Math.min(12, parseInt(searchParams.get("step") || "1", 10) || 1));

  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [welcomeLine, setWelcomeLine] = useState(initialShortDescription);
  const [sellSlug, setSellSlug] = useState<(typeof SELL_TYPES)[number]["slug"] | "">("");
  const [productTitle, setProductTitle] = useState("");
  const [priceEur, setPriceEur] = useState("");
  const [productBlurb, setProductBlurb] = useState("");
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState("");
  const [classMinutes, setClassMinutes] = useState<number | null>(null);
  const [classPriceEur, setClassPriceEur] = useState("");
  const [createdExperienceId, setCreatedExperienceId] = useState<string | null>(null);
  const [productPublished, setProductPublished] = useState(false);
  const [classPublished, setClassPublished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stripeSyncing, setStripeSyncing] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [resumeHint, setResumeHint] = useState<GuidedResume | null>(null);
  const quickScheduleSubmitLock = useRef(false);
  const stripeSyncAttemptedRef = useRef(false);

  const showWelcomeBanner = searchParams.get("welcome") === "1";
  const stripeDone = searchParams.get("stripe") === "done";

  const guidedStorageKey = `pm_guided_${studioId}`;

  const setQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const q = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") q.delete(k);
        else q.set(k, v);
      }
      router.push(`${pathname}?${q.toString()}`);
    },
    [pathname, router, searchParams],
  );

  const goHub = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("flow");
    q.delete("step");
    q.delete("welcome");
    q.delete("stripe");
    router.push(`${pathname}?${q.toString()}`);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (!(stripeDone && flow === "paid")) return;
    if (stripeSyncAttemptedRef.current) return;
    stripeSyncAttemptedRef.current = true;
    setStripeSyncing(true);
    (async () => {
      try {
        await fetch(`/api/studios/${studioId}/stripe/sync`, { cache: "no-store" });
      } catch {
        /* non-fatal; user can still refresh from studio workspace */
      } finally {
        setStripeSyncing(false);
      }
    })();
  }, [stripeDone, flow, studioId]);

  useEffect(() => {
    setErr(null);
  }, [flow, step]);

  useEffect(() => {
    if (!flow) return;
    const terminalClear =
      (flow === "studio" && step >= 3) ||
      (flow === "paid" && stripeDone) ||
      (flow === "sell" && step >= 5 && productPublished) ||
      (flow === "class" && step >= 6 && classPublished);
    if (terminalClear) {
      try {
        localStorage.removeItem(guidedStorageKey);
      } catch {
        /* ignore */
      }
      setResumeHint(null);
      return;
    }
    try {
      localStorage.setItem(guidedStorageKey, JSON.stringify({ flow, step, at: Date.now() } satisfies GuidedResume));
    } catch {
      /* ignore */
    }
  }, [flow, step, studioId, stripeDone, productPublished, classPublished, guidedStorageKey]);

  useEffect(() => {
    if (flow) return;
    try {
      const raw = localStorage.getItem(guidedStorageKey);
      if (!raw) {
        setResumeHint(null);
        return;
      }
      const j = JSON.parse(raw) as { flow?: string; step?: unknown; at?: unknown };
      const f = parseFlow(typeof j.flow === "string" ? j.flow : null);
      const st = typeof j.step === "number" ? j.step : parseInt(String(j.step), 10);
      const at = typeof j.at === "number" ? j.at : 0;
      if (!f || !Number.isFinite(st) || st < 1) {
        setResumeHint(null);
        return;
      }
      const maxAgeMs = 72 * 60 * 60 * 1000;
      if (Date.now() - at > maxAgeMs) {
        setResumeHint(null);
        return;
      }
      setResumeHint({ flow: f, step: st, at });
    } catch {
      setResumeHint(null);
    }
  }, [flow, studioId, guidedStorageKey]);

  const dismissResume = useCallback(() => {
    try {
      localStorage.removeItem(guidedStorageKey);
    } catch {
      /* ignore */
    }
    setResumeHint(null);
  }, [guidedStorageKey]);

  const openPaidFlow = useCallback(() => {
    setQuery({ flow: "paid", step: "1", stripe: null });
  }, [setQuery]);

  const startSellFlow = useCallback(() => {
    setSellSlug("");
    setProductTitle("");
    setPriceEur("");
    setProductBlurb("");
    setCreatedProductId(null);
    setProductPublished(false);
    setQuery({ flow: "sell", step: "1", stripe: null });
  }, [setQuery]);

  const startClassFlow = useCallback(() => {
    setClassTitle("");
    setClassMinutes(null);
    setClassPriceEur("");
    setCreatedExperienceId(null);
    setClassPublished(false);
    setQuery({ flow: "class", step: "1", stripe: null });
  }, [setQuery]);

  const suggestCopy = useCallback(
    async (kind: "welcome" | "product") => {
      setAiBusy(true);
      setErr(null);
      try {
        const res = await fetch(`/api/studios/${studioId}/guided/suggest`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            kind === "welcome"
              ? { kind: "welcome", studioName: displayName }
              : {
                  kind: "product",
                  title: productTitle,
                  categoryLabel: SELL_TYPES.find((s) => s.slug === sellSlug)?.label ?? "",
                  studioName: displayName,
                },
          ),
        });
        const j = (await res.json()) as { text?: string; error?: string };
        if (!res.ok) throw new Error(j.error ?? "Could not suggest");
        if (j.text) {
          if (kind === "welcome") setWelcomeLine(j.text);
          else setProductBlurb(j.text);
        }
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Suggestion failed");
      } finally {
        setAiBusy(false);
      }
    },
    [studioId, displayName, productTitle, sellSlug],
  );

  const saveStudioStep = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          shortDescription: welcomeLine.trim() || null,
        }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not save");
      setQuery({ step: String(step + 1) });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }, [studioId, displayName, welcomeLine, step, setQuery]);

  const createDraftProduct = useCallback(async () => {
    const euros = parseFloat(priceEur.replace(",", "."));
    if (!productTitle.trim() || !sellSlug || !Number.isFinite(euros) || euros < 0) {
      setErr("Add a name and a price.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: productTitle.trim(),
          category: sellSlug,
          priceCents: Math.round(euros * 100),
          status: "draft",
          pricingType: "one_time",
          shortDescription: productBlurb.trim() || null,
        }),
      });
      const j = (await res.json()) as { product?: { id: string }; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not create");
      if (j.product?.id) setCreatedProductId(j.product.id);
      setQuery({ step: "5" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }, [studioId, productTitle, sellSlug, priceEur, productBlurb, setQuery]);

  const publishProduct = useCallback(async () => {
    if (!createdProductId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/products/${createdProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not publish");
      setProductPublished(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }, [studioId, createdProductId]);

  const publishClass = useCallback(async () => {
    if (!createdExperienceId) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/experiences/${createdExperienceId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });
      const j = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not publish");
      setClassPublished(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }, [studioId, createdExperienceId]);

  const createDraftClass = useCallback(async () => {
    const euros = parseFloat(classPriceEur.replace(",", "."));
    if (!classTitle.trim() || classMinutes == null || !Number.isFinite(euros) || euros < 0) {
      setErr("Add a name, length, and price.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/experiences`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: classTitle.trim(),
          experienceType: "workshop",
          locationType: "studio_address",
          durationMinutes: classMinutes,
          capacity: 8,
          minimumParticipants: 1,
          maximumParticipants: 8,
          priceCents: Math.round(euros * 100),
          status: "draft",
          pricingType: "one_time",
          visibility: "public",
        }),
      });
      const j = (await res.json()) as { experience?: { id: string }; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not create");
      if (j.experience?.id) {
        setCreatedExperienceId(j.experience.id);
        setQuery({ step: "5" });
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  }, [studioId, classTitle, classMinutes, classPriceEur, setQuery]);

  const applyQuickSchedule = useCallback(
    async (preset: "sat_am" | "sun_pm" | "wed_eve") => {
      if (!createdExperienceId || quickScheduleSubmitLock.current) return;
      quickScheduleSubmitLock.current = true;
      setBusy(true);
      setErr(null);
      try {
        const res = await fetch(`/api/studios/${studioId}/guided/quick-schedule`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ experienceId: createdExperienceId, preset }),
        });
        const j = (await res.json()) as { error?: string; slotsCreated?: number };
        if (!res.ok) throw new Error(j.error ?? "Could not add times");
        setQuery({ step: "6" });
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
      } finally {
        setBusy(false);
        quickScheduleSubmitLock.current = false;
      }
    },
    [studioId, createdExperienceId, setQuery],
  );

  const startStripe = useCallback(async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/stripe/onboard`, { method: "POST" });
      const j = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) throw new Error(j.error ?? "Could not start");
      if (j.url) window.location.href = j.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not connect");
    } finally {
      setBusy(false);
    }
  }, [studioId]);

  const hub = useMemo(
    () => (
      <div className="space-y-8">
        {resumeHint ? (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold">Continue where you stopped</p>
            <p className="mt-1 text-amber-900/90">
              {flowSummaryLabel(resumeHint.flow)} · step {resumeHint.step}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setQuery({
                    flow: resumeHint.flow,
                    step: String(resumeHint.step),
                    stripe: null,
                  })
                }
                className={`${ui.buttonPrimary} min-h-10 px-5 py-2 text-sm`}
              >
                Continue
              </button>
              <button type="button" className="text-sm font-medium text-stone-600 underline underline-offset-2" onClick={dismissResume}>
                Not now
              </button>
            </div>
          </div>
        ) : null}

        {showWelcomeBanner ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-sm text-emerald-950">
            <p className="font-semibold">You’re in.</p>
            <p className="mt-1 text-emerald-900/90">Pick one thing below. You can do the rest later.</p>
            <button
              type="button"
              className="mt-3 text-sm font-medium text-emerald-800 underline underline-offset-2"
              onClick={() => {
                const q = new URLSearchParams(searchParams.toString());
                q.delete("welcome");
                q.delete("stripe");
                router.replace(`${pathname}?${q.toString()}`);
              }}
            >
              Got it
            </button>
          </div>
        ) : null}

        <div>
          <h1 className="font-serif text-2xl font-medium leading-snug text-(--brand-ink)">What do you want to set up?</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">Pick one. You can do the rest later.</p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setQuery({ flow: "studio", step: "1", stripe: null })}
            className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm transition active:scale-[0.99] hover:border-amber-200"
          >
            Finish my public page
          </button>
          <button type="button" onClick={startSellFlow} className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm transition active:scale-[0.99] hover:border-amber-200">
            Add something to sell
          </button>
          <button type="button" onClick={startClassFlow} className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm transition active:scale-[0.99] hover:border-amber-200">
            Add a class people can book
          </button>
        </div>

        <div className="space-y-3 border-t border-stone-200/80 pt-6 text-center">
          <p>
            <button type="button" className="text-sm font-medium text-amber-900 underline underline-offset-2" onClick={openPaidFlow}>
              Get paid to your bank
            </button>
          </p>
          <p>
            <Link
              href={`/studios/${studioId}`}
              className="text-sm font-medium text-amber-900 underline underline-offset-2"
              target="_blank"
              rel="noreferrer"
            >
              See my public page
            </Link>
          </p>
        </div>
      </div>
    ),
    [
      router,
      searchParams,
      setQuery,
      showWelcomeBanner,
      pathname,
      resumeHint,
      dismissResume,
      startSellFlow,
      startClassFlow,
      openPaidFlow,
      studioId,
    ],
  );

  /* ─── Studio flow (3 steps) ─── */
  if (flow === "studio") {
    const total = 3;
    return (
      <div>
        <button type="button" onClick={step <= 1 ? goHub : () => setQuery({ step: String(step - 1) })} className="mb-6 text-sm font-medium text-amber-900">
          ← {step <= 1 ? "Home" : "Back"}
        </button>
        <ProgressDots step={step} total={total} />
        {err ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {err}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Name your studio</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">This is the name people see on your public page.</p>
            </div>
            <label className="block" htmlFor="guided-studio-name">
              <span className="text-sm font-medium text-stone-700">Studio name</span>
              <input
                id="guided-studio-name"
                className={`${ui.input} mt-2`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="organization"
              />
            </label>
            <button type="button" disabled={busy || !displayName.trim()} onClick={() => setQuery({ step: "2" })} className={`${ui.buttonPrimary} w-full`}>
              Next
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Say what you do in one line</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">This shows on your public page. You can change it anytime.</p>
            </div>
            <label className="block" htmlFor="guided-studio-welcome">
              <span className="text-sm font-medium text-stone-700">One short line</span>
              <textarea
                id="guided-studio-welcome"
                className={`${ui.input} mt-2 min-h-28 resize-y`}
                value={welcomeLine}
                onChange={(e) => setWelcomeLine(e.target.value)}
                placeholder="For example: Small-batch pots from our studio in Lisbon."
              />
            </label>
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => suggestCopy("welcome")}
              className={`${ui.buttonSecondary} w-full`}
            >
              {aiBusy ? "…" : "Write one for me"}
            </button>
            <button type="button" disabled={busy} onClick={saveStudioStep} className={`${ui.buttonPrimary} w-full`}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6 text-center">
            <p className="text-4xl" aria-hidden>
              ✓
            </p>
            <h2 className="font-serif text-xl font-medium text-(--brand-ink)">Saved</h2>
            <p className="text-sm leading-relaxed text-stone-600">Your public page is updated. Share it when you’re ready.</p>
            <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
              See my public page
            </Link>
            <button type="button" onClick={goHub} className={`${ui.buttonPrimary} w-full`}>
              Done
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  /* ─── Sell flow ─── */
  if (flow === "sell") {
    const total = 5;
    return (
      <div>
        <button type="button" onClick={step <= 1 ? goHub : () => setQuery({ step: String(step - 1) })} className="mb-6 text-sm font-medium text-amber-900">
          ← {step <= 1 ? "Home" : "Back"}
        </button>
        <ProgressDots step={step} total={total} />
        {err ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {err}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">What kind of thing are you selling?</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">Pick the closest match. You can change it later.</p>
            </div>
            <div className="grid gap-3">
              {SELL_TYPES.map((t) => (
                <button
                  key={t.slug}
                  type="button"
                  onClick={() => {
                    setSellSlug(t.slug);
                    setQuery({ step: "2" });
                  }}
                  className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm transition hover:border-amber-200"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Name it and set a price</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">What will people see and pay?</p>
            </div>
            <label className="block" htmlFor="guided-product-title">
              <span className="text-sm font-medium text-stone-700">Name</span>
              <input
                id="guided-product-title"
                className={`${ui.input} mt-2`}
                value={productTitle}
                onChange={(e) => setProductTitle(e.target.value)}
                placeholder="For example: Speckled breakfast bowl"
                autoComplete="off"
              />
            </label>
            <label className="block" htmlFor="guided-product-price">
              <span className="text-sm font-medium text-stone-700">Price (€)</span>
              <input
                id="guided-product-price"
                inputMode="decimal"
                className={`${ui.input} mt-2`}
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                placeholder="For example: 38"
              />
            </label>
            <button
              type="button"
              disabled={!productTitle.trim() || !priceEur.trim()}
              onClick={() => setQuery({ step: "3" })}
              className={`${ui.buttonPrimary} w-full`}
            >
              Next
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Say one thing about it</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">Optional. A short line that helps people decide.</p>
            </div>
            <label className="block" htmlFor="guided-product-blurb">
              <span className="text-sm font-medium text-stone-700">Short line</span>
              <textarea
                id="guided-product-blurb"
                className={`${ui.input} mt-2 min-h-24 resize-y`}
                value={productBlurb}
                onChange={(e) => setProductBlurb(e.target.value)}
              />
            </label>
            <button type="button" disabled={aiBusy} onClick={() => suggestCopy("product")} className={`${ui.buttonSecondary} w-full`}>
              {aiBusy ? "…" : "Write one for me"}
            </button>
            <button type="button" onClick={() => setQuery({ step: "4" })} className={`${ui.buttonPrimary} w-full`}>
              Next
            </button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Save this product</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">We start it as a draft. Nothing is public until you say so.</p>
            </div>
            <button type="button" disabled={busy} onClick={createDraftProduct} className={`${ui.buttonPrimary} w-full`}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6 text-center">
            {productPublished ? (
              <>
                <p className="text-4xl" aria-hidden>
                  ✓
                </p>
                <h2 className="font-serif text-xl font-medium text-(--brand-ink)">Your product is on your page</h2>
                <p className="text-sm leading-relaxed text-stone-600">People can now see this on your public page.</p>
                <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
                  See my public page
                </Link>
                <button type="button" onClick={startSellFlow} className={`${ui.buttonSecondary} w-full`}>
                  Add another product
                </button>
                <button type="button" onClick={goHub} className={`${ui.buttonPrimary} w-full`}>
                  Done
                </button>
              </>
            ) : (
              <>
                <p className="text-4xl" aria-hidden>
                  ✓
                </p>
                <h2 className="font-serif text-xl font-medium text-(--brand-ink)">Saved as a draft</h2>
                <p className="text-sm leading-relaxed text-stone-600">Put it on your page after you connect your bank.</p>
                <button type="button" disabled={busy} onClick={publishProduct} className={`${ui.buttonPrimary} w-full`}>
                  {busy ? "…" : "Put it on my page"}
                </button>
                {err ? (
                  <p className="text-sm text-amber-900" role="alert">
                    {err}
                  </p>
                ) : null}
                <button type="button" onClick={openPaidFlow} className={`${ui.buttonSecondary} w-full`}>
                  Get paid to your bank
                </button>
                <button type="button" onClick={startSellFlow} className={`${ui.buttonSecondary} w-full`}>
                  Add another product
                </button>
                <button type="button" onClick={goHub} className="w-full text-sm font-medium text-stone-500 underline">
                  Back to menu
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  /* ─── Class flow ─── */
  if (flow === "class") {
    const total = 6;
    return (
      <div>
        <button type="button" onClick={step <= 1 ? goHub : () => setQuery({ step: String(step - 1) })} className="mb-6 text-sm font-medium text-amber-900">
          ← {step <= 1 ? "Home" : "Back"}
        </button>
        <ProgressDots step={step} total={total} />
        {err ? (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {err}
          </p>
        ) : null}

        {step === 1 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Name your class</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">This is the title people see when they book.</p>
            </div>
            <label className="block" htmlFor="guided-class-title">
              <span className="text-sm font-medium text-stone-700">Class name</span>
              <input
                id="guided-class-title"
                className={`${ui.input} mt-2`}
                value={classTitle}
                onChange={(e) => setClassTitle(e.target.value)}
                placeholder="For example: Saturday hand-building"
                autoComplete="off"
              />
            </label>
            <button
              type="button"
              disabled={!classTitle.trim()}
              onClick={() => setQuery({ step: "2" })}
              className={`${ui.buttonPrimary} w-full`}
            >
              Next
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">How long is the class?</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">Pick the closest match. You can change this later.</p>
            </div>
            <div className="grid gap-3">
              {CLASS_LENGTHS.map((L) => (
                <button
                  key={L.minutes}
                  type="button"
                  onClick={() => {
                    setClassMinutes(L.minutes);
                    setQuery({ step: "3" });
                  }}
                  className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm"
                >
                  {L.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">How much per person?</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">Amount in euros for one seat.</p>
            </div>
            <label className="block" htmlFor="guided-class-price">
              <span className="text-sm font-medium text-stone-700">Price (€)</span>
              <input
                id="guided-class-price"
                inputMode="decimal"
                className={`${ui.input} mt-2`}
                value={classPriceEur}
                onChange={(e) => setClassPriceEur(e.target.value)}
                placeholder="For example: 45"
              />
            </label>
            <button type="button" disabled={!classPriceEur.trim()} onClick={() => setQuery({ step: "4" })} className={`${ui.buttonPrimary} w-full`}>
              Next
            </button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6 text-center">
            {createdExperienceId ? (
              <>
                <h2 className="font-serif text-xl font-medium text-(--brand-ink)">Saved</h2>
                <p className="text-sm leading-relaxed text-stone-600">Next, add times people can book.</p>
                <button type="button" onClick={() => setQuery({ step: "5" })} className={`${ui.buttonPrimary} w-full`}>
                  Next
                </button>
              </>
            ) : (
              <>
                <div className="text-left">
                  <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Save this class</h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">We start it as a draft. Nothing is public until you say so.</p>
                </div>
                <button type="button" disabled={busy} onClick={createDraftClass} className={`${ui.buttonPrimary} w-full`}>
                  {busy ? "Saving…" : "Save class"}
                </button>
              </>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">When do you run it?</h2>
              <p className="text-sm leading-relaxed text-stone-600">
                Pick one time pattern. We add bookable slots for the next few weeks. You can edit them anytime.
              </p>
            </div>
            <div className="grid gap-3">
              {SCHEDULE_PRESETS.map((s) => (
                <button
                  key={s.preset}
                  type="button"
                  disabled={busy}
                  onClick={() => applyQuickSchedule(s.preset)}
                  className="flex min-h-14 flex-col justify-center rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-amber-200"
                >
                  <span className="text-base font-medium text-stone-900">{s.label}</span>
                  <span className="text-sm text-stone-500">{s.hint}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => setQuery({ step: "6" })}
              className={`${ui.buttonSecondary} w-full`}
            >
              I’ll add times later
            </button>
          </div>
        ) : null}

        {step === 6 ? (
          <div className="space-y-6 text-center">
            {classPublished ? (
              <>
                <p className="text-4xl" aria-hidden>
                  ✓
                </p>
                <h2 className="font-serif text-xl font-medium text-(--brand-ink)">Your class is on your page</h2>
                <p className="text-sm leading-relaxed text-stone-600">
                  People can book when there are open times. Add or change times in your planner whenever you want.
                </p>
                <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
                  Preview my page
                </Link>
                <Link href={`/dashboard/${studioId}/programs/planner`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`}>
                  Open class planner
                </Link>
                <button type="button" onClick={startClassFlow} className={`${ui.buttonSecondary} w-full`}>
                  Add another class
                </button>
                <button type="button" onClick={goHub} className={`${ui.buttonPrimary} w-full`}>
                  Done
                </button>
              </>
            ) : (
              <>
                <p className="text-4xl" aria-hidden>
                  ✓
                </p>
                <h2 className="font-serif text-xl font-medium text-(--brand-ink)">Saved as a draft</h2>
                <p className="text-sm leading-relaxed text-stone-600">
                  Put it on your page after you connect your bank. Then people can book when there are open times.
                </p>
                <button type="button" disabled={busy} onClick={publishClass} className={`${ui.buttonPrimary} w-full`}>
                  {busy ? "…" : "Put it on my page"}
                </button>
                <button type="button" onClick={openPaidFlow} className={`${ui.buttonSecondary} w-full`}>
                  Get paid to your bank
                </button>
                <Link href={`/dashboard/${studioId}/programs/planner`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`}>
                  Open class planner
                </Link>
                <button type="button" onClick={goHub} className="w-full text-sm font-medium text-stone-500 underline">
                  Back to menu
                </button>
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  /* ─── Paid flow ─── */
  if (flow === "paid") {
    return (
      <div>
        <button type="button" onClick={goHub} className="mb-6 text-sm font-medium text-amber-900">
          ← Home
        </button>
        {stripeDone ? (
          <div className="space-y-6 text-center">
            <p className="text-4xl" aria-hidden>
              ✓
            </p>
            <h2 className="font-serif text-xl font-medium text-(--brand-ink)">You’re connected</h2>
            <p className="text-sm leading-relaxed text-stone-600">
              {stripeSyncing
                ? "Checking your status…"
                : "You’ll be able to take payments once Stripe finishes checking. This usually takes a few minutes."}
            </p>
            <p className="text-sm text-stone-600">Next, put drafts on your page or add more.</p>
            <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
              See my public page
            </Link>
            <button type="button" onClick={startSellFlow} className={`${ui.buttonSecondary} w-full`}>
              Add something to sell
            </button>
            <button type="button" onClick={startClassFlow} className={`${ui.buttonSecondary} w-full`}>
              Add a class people can book
            </button>
            <button type="button" onClick={goHub} className={`${ui.buttonPrimary} w-full`}>
              Back to menu
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-medium leading-snug text-(--brand-ink)">Get paid to your bank</h2>
              <p className="mt-2 text-sm leading-relaxed text-stone-600">
                A secure partner (Stripe) sends the money to your bank. You’ll add a few details once — name, bank, ID.
              </p>
            </div>
            <ul className="list-disc space-y-2 pl-5 text-sm text-stone-600">
              <li>People pay you through your public page.</li>
              <li>The money lands in your bank.</li>
              <li>You can pause anytime.</li>
            </ul>
            <button type="button" disabled={busy} onClick={startStripe} className={`${ui.buttonPrimary} w-full`}>
              {busy ? "Opening…" : "Continue"}
            </button>
            {err ? (
              <p className="text-sm text-red-600" role="alert">
                {err}
              </p>
            ) : null}
          </div>
        )}
      </div>
    );
  }

  return hub;
}
