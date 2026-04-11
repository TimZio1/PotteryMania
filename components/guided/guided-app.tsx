"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ui } from "@/lib/ui-styles";

const SELL_TYPES = [
  { label: "Bowls, plates & mugs", slug: "tableware" },
  { label: "Decor & art pieces", slug: "decorative-objects" },
  { label: "Plants & home", slug: "vases-plant-pots" },
] as const;

const CLASS_LENGTHS = [
  { label: "Around 1½ hours", minutes: 90 },
  { label: "Around 3 hours", minutes: 180 },
  { label: "A full day", minutes: 420 },
] as const;

const SCHEDULE_PRESETS = [
  { preset: "sat_am" as const, label: "Saturday morning", hint: "10:00–12:30" },
  { preset: "sun_pm" as const, label: "Sunday afternoon", hint: "14:00–17:00" },
  { preset: "wed_eve" as const, label: "Wednesday evening", hint: "18:00–20:30" },
];

type Flow = "studio" | "sell" | "class" | "paid" | null;

function parseFlow(v: string | null): Flow {
  if (v === "studio" || v === "sell" || v === "class" || v === "paid") return v;
  return null;
}

type GuidedResume = { flow: Exclude<Flow, null>; step: number; at: number };

function flowSummaryLabel(flow: Exclude<Flow, null>): string {
  switch (flow) {
    case "studio":
      return "Friendlier public page";
    case "sell":
      return "Something to sell";
    case "class":
      return "A bookable class";
    case "paid":
      return "How you get paid";
    default:
      return "Setup";
  }
}

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
  const [err, setErr] = useState<string | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [resumeHint, setResumeHint] = useState<GuidedResume | null>(null);
  const quickScheduleSubmitLock = useRef(false);

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
    if (stripeDone && flow === "paid") {
      /* success UI handled in paid branch */
    }
  }, [stripeDone, flow]);

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
        {showWelcomeBanner ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-sm text-emerald-950">
            <p className="font-semibold">You’re in. Nice work.</p>
            <p className="mt-1 text-emerald-900/90">Pick one thing below — each path takes a few taps.</p>
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
              Okay
            </button>
          </div>
        ) : null}

        {resumeHint ? (
          <div
            className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-4 text-sm text-amber-950"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold">Pick up where you left off</p>
            <p className="mt-1 text-amber-900/90">
              {flowSummaryLabel(resumeHint.flow)} — step {resumeHint.step}
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
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        <div>
          <h1 className="font-serif text-2xl font-normal text-(--brand-ink)">What do you want to do?</h1>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">One thing at a time. Nothing here is permanent.</p>
        </div>

        <div className="grid gap-3">
          <button
            type="button"
            onClick={() => setQuery({ flow: "studio", step: "1", stripe: null })}
            className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm transition active:scale-[0.99] hover:border-amber-200"
          >
            Make my public page friendlier
          </button>
          <button type="button" onClick={startSellFlow} className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm transition active:scale-[0.99] hover:border-amber-200">
            Add something to sell
          </button>
          <button type="button" onClick={startClassFlow} className="min-h-14 rounded-2xl border border-stone-200 bg-white px-4 py-4 text-left text-base font-medium text-stone-900 shadow-sm transition active:scale-[0.99] hover:border-amber-200">
            Add a class people can book
          </button>
        </div>

        <p className="text-center text-sm text-stone-500">
          <button type="button" className="font-medium text-amber-900 underline underline-offset-2" onClick={openPaidFlow}>
            Set up how you get paid
          </button>
        </p>

        <p className="text-center text-sm text-stone-500">
          <Link
            href={`/studios/${studioId}`}
            className="font-medium text-amber-900 underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Preview my public page
          </Link>
        </p>
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
            <h2 className="font-serif text-xl text-(--brand-ink)">What should people call you?</h2>
            <label className="block">
              <span className="text-sm text-stone-600">Your studio name</span>
              <input
                className={`${ui.input} mt-2`}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                autoComplete="organization"
              />
            </label>
            <button type="button" disabled={busy || !displayName.trim()} onClick={() => setQuery({ step: "2" })} className={`${ui.buttonPrimary} w-full`}>
              Continue
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <h2 className="font-serif text-xl text-(--brand-ink)">One welcoming line</h2>
            <p className="text-sm text-stone-600">This shows on your public page. You can change it anytime.</p>
            <textarea
              className={`${ui.input} min-h-28 resize-y`}
              value={welcomeLine}
              onChange={(e) => setWelcomeLine(e.target.value)}
              placeholder="e.g. Small-batch pots from our studio in Lisbon."
            />
            <button
              type="button"
              disabled={aiBusy}
              onClick={() => suggestCopy("welcome")}
              className={`${ui.buttonSecondary} w-full`}
            >
              {aiBusy ? "…" : "Suggest a line for me"}
            </button>
            <button type="button" disabled={busy} onClick={saveStudioStep} className={`${ui.buttonPrimary} w-full`}>
              {busy ? "Saving…" : "Save & continue"}
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6 text-center">
            <p className="text-4xl" aria-hidden>
              ✓
            </p>
            <h2 className="font-serif text-xl text-(--brand-ink)">Saved</h2>
            <p className="text-sm text-stone-600">Your page is a bit more human. Share it when you’re ready.</p>
            <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
              Preview my page
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
            <h2 className="font-serif text-xl text-(--brand-ink)">What kind of piece?</h2>
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
            <h2 className="font-serif text-xl text-(--brand-ink)">Name and price</h2>
            <label className="block">
              <span className="text-sm text-stone-600">What is it called?</span>
              <input className={`${ui.input} mt-2`} value={productTitle} onChange={(e) => setProductTitle(e.target.value)} placeholder="e.g. Speckled breakfast bowl" />
            </label>
            <label className="block">
              <span className="text-sm text-stone-600">Price in euros (whole numbers are fine)</span>
              <input
                inputMode="decimal"
                className={`${ui.input} mt-2`}
                value={priceEur}
                onChange={(e) => setPriceEur(e.target.value)}
                placeholder="e.g. 38"
              />
            </label>
            <button
              type="button"
              disabled={!productTitle.trim() || !priceEur.trim()}
              onClick={() => setQuery({ step: "3" })}
              className={`${ui.buttonPrimary} w-full`}
            >
              Continue
            </button>
          </div>
        ) : null}

        {step === 3 ? (
          <div className="space-y-6">
            <h2 className="font-serif text-xl text-(--brand-ink)">A line for shoppers</h2>
            <p className="text-sm text-stone-600">Optional. Helps people imagine the piece.</p>
            <textarea className={`${ui.input} min-h-24 resize-y`} value={productBlurb} onChange={(e) => setProductBlurb(e.target.value)} />
            <button type="button" disabled={aiBusy} onClick={() => suggestCopy("product")} className={`${ui.buttonSecondary} w-full`}>
              {aiBusy ? "…" : "Suggest text for me"}
            </button>
            <button type="button" onClick={() => setQuery({ step: "4" })} className={`${ui.buttonPrimary} w-full`}>
              Continue
            </button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6">
            <h2 className="font-serif text-xl text-(--brand-ink)">Save your listing</h2>
            <p className="text-sm text-stone-600">We’ll save it as a draft. You can publish when payouts are ready.</p>
            <button type="button" disabled={busy} onClick={createDraftProduct} className={`${ui.buttonPrimary} w-full`}>
              {busy ? "Saving…" : "Save listing"}
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
                <h2 className="font-serif text-xl text-(--brand-ink)">It’s on your page</h2>
                <p className="text-sm text-stone-600">People can see this listing on your public studio page.</p>
                <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
                  Preview my page
                </Link>
                <button type="button" onClick={startSellFlow} className={`${ui.buttonSecondary} w-full`}>
                  Add another item
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
                <h2 className="font-serif text-xl text-(--brand-ink)">Saved as a draft</h2>
                <p className="text-sm text-stone-600">Put it on your page after you connect how you get paid.</p>
                <button type="button" disabled={busy} onClick={publishProduct} className={`${ui.buttonPrimary} w-full`}>
                  {busy ? "…" : "Put on my page now"}
                </button>
                {err ? (
                  <p className="text-sm text-amber-900" role="alert">
                    {err}
                  </p>
                ) : null}
                <button type="button" onClick={openPaidFlow} className={`${ui.buttonSecondary} w-full`}>
                  Set up how I get paid
                </button>
                <button type="button" onClick={startSellFlow} className={`${ui.buttonSecondary} w-full`}>
                  Start another listing
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
            <h2 className="font-serif text-xl text-(--brand-ink)">What’s the class called?</h2>
            <input className={ui.input} value={classTitle} onChange={(e) => setClassTitle(e.target.value)} placeholder="e.g. Saturday hand-building" />
            <button type="button" disabled={!classTitle.trim()} onClick={() => setQuery({ step: "2" })} className={`${ui.buttonPrimary} w-full`}>
              Continue
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <h2 className="font-serif text-xl text-(--brand-ink)">How long is it?</h2>
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
            <h2 className="font-serif text-xl text-(--brand-ink)">Price per person (euros)</h2>
            <input
              inputMode="decimal"
              className={ui.input}
              value={classPriceEur}
              onChange={(e) => setClassPriceEur(e.target.value)}
              placeholder="e.g. 45"
            />
            <button type="button" disabled={!classPriceEur.trim()} onClick={() => setQuery({ step: "4" })} className={`${ui.buttonPrimary} w-full`}>
              Continue
            </button>
          </div>
        ) : null}

        {step === 4 ? (
          <div className="space-y-6 text-center">
            {createdExperienceId ? (
              <>
                <p className="text-sm text-stone-600">Your class is saved. Next, pick times people can book.</p>
                <button type="button" onClick={() => setQuery({ step: "5" })} className={`${ui.buttonPrimary} w-full`}>
                  Continue
                </button>
              </>
            ) : (
              <button type="button" disabled={busy} onClick={createDraftClass} className={`${ui.buttonPrimary} w-full`}>
                {busy ? "Saving…" : "Save class"}
              </button>
            )}
          </div>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <h2 className="font-serif text-xl text-(--brand-ink)">When does it usually run?</h2>
            <p className="text-sm text-stone-600">Pick one — we’ll add bookable times for the next several weeks. You can edit later.</p>
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
                <h2 className="font-serif text-xl text-(--brand-ink)">Class is live on your page</h2>
                <p className="text-sm text-stone-600">
                  People can book when there are upcoming times. Add or change times anytime in the planner.
                </p>
                <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
                  Preview my page
                </Link>
                <Link href={`/dashboard/experiences/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`}>
                  Open full class planner
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
                <h2 className="font-serif text-xl text-(--brand-ink)">You’re set</h2>
                <p className="text-sm text-stone-600">
                  Your class is saved as a draft. Put it on your page after payouts are connected — then people can book when there are times.
                </p>
                <button type="button" disabled={busy} onClick={publishClass} className={`${ui.buttonPrimary} w-full`}>
                  {busy ? "…" : "Put on my page now"}
                </button>
                <button type="button" onClick={openPaidFlow} className={`${ui.buttonSecondary} w-full`}>
                  Set up how I get paid
                </button>
                <Link href={`/dashboard/experiences/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`}>
                  Open full class planner
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
            <h2 className="font-serif text-xl text-(--brand-ink)">You’re connected</h2>
            <p className="text-sm text-stone-600">When Stripe finishes checking, you can take payments. This can take a few minutes.</p>
            <p className="text-sm text-stone-600">Next, you can put drafts on your page or add more.</p>
            <Link href={`/studios/${studioId}`} className={`${ui.buttonSecondary} inline-flex w-full justify-center`} target="_blank" rel="noreferrer">
              Preview my page
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
            <h2 className="font-serif text-xl text-(--brand-ink)">How you get paid</h2>
            <p className="text-sm leading-relaxed text-stone-600">
              We use a secure partner to send money to your bank. You’ll fill in a few details — name, bank, ID — the usual
              once-only setup.
            </p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-stone-600">
              <li>Customers pay you through your page.</li>
              <li>Money moves to your bank account.</li>
              <li>You can pause anytime.</li>
            </ul>
            <button type="button" disabled={busy} onClick={startStripe} className={`${ui.buttonPrimary} w-full`}>
              {busy ? "Opening…" : "Continue to secure setup"}
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
