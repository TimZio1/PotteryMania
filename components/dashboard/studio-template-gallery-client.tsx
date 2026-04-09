"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BusinessTemplateDefinition } from "@/lib/business-templates";
import { BUSINESS_TEMPLATE_NOT_STRUCTURED_LEFT } from "@/lib/business-templates";
import { getBusinessTemplateVisuals } from "@/lib/business-template-visuals";
import { ui } from "@/lib/ui-styles";

function money(cents: number, currency: string) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency }).format(cents / 100);
}

type Phase = "preview" | "confirm" | "success";

function emitFunnelEvent(
  studioId: string,
  eventType: "gallery_view" | "drawer_open" | "activate_click",
  templateSlug?: string,
) {
  void fetch(`/api/studios/${studioId}/business-template/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventType,
      ...(templateSlug ? { templateSlug } : {}),
    }),
  }).catch((error: unknown) => {
    console.warn("[template-gallery] failed to emit funnel event", error);
  });
}

export default function StudioTemplateGalleryClient({
  studioId,
  templates,
  initialSlug,
  studioRecommendedSlug,
  defaultTemplateSlug,
}: {
  studioId: string;
  templates: BusinessTemplateDefinition[];
  initialSlug: string | null;
  studioRecommendedSlug: string | null;
  defaultTemplateSlug: string | null;
}) {
  const router = useRouter();
  const [currentSlug, setCurrentSlug] = useState<string | null>(initialSlug);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<BusinessTemplateDefinition | null>(null);
  const [phase, setPhase] = useState<Phase>("preview");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const galleryViewSent = useRef(false);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setPhase("preview");
    setSelected(null);
    setError(null);
  }, []);

  useEffect(() => {
    setCurrentSlug(initialSlug);
  }, [initialSlug]);

  useEffect(() => {
    if (galleryViewSent.current) return;
    galleryViewSent.current = true;
    emitFunnelEvent(studioId, "gallery_view");
  }, [studioId]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, closeDrawer]);

  useEffect(() => {
    if (drawerOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  function openPreview(t: BusinessTemplateDefinition) {
    emitFunnelEvent(studioId, "drawer_open", t.slug);
    setSelected(t);
    setPhase("preview");
    setError(null);
    setDrawerOpen(true);
  }

  function goConfirm() {
    if (selected) emitFunnelEvent(studioId, "activate_click", selected.slug);
    setPhase("confirm");
  }

  const currentTemplate = currentSlug ? templates.find((x) => x.slug === currentSlug) ?? null : null;

  async function activate() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/business-template`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateSlug: selected.slug }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not activate template.");
        setBusy(false);
        return;
      }
      setCurrentSlug(selected.slug);
      setPhase("success");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const leftSummary =
    currentTemplate?.currentSetupSummary ?? BUSINESS_TEMPLATE_NOT_STRUCTURED_LEFT;
  const rightSummary = selected?.newSetupSummary ?? "";
  const drawerVisual = selected ? getBusinessTemplateVisuals(selected.visualTheme) : getBusinessTemplateVisuals("wear");
  const selectedIsWear = selected?.visualTheme === "wear";

  if (templates.length === 0) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-amber-200 bg-amber-50/60 px-6 py-8 text-center">
        <p className="text-lg font-semibold text-amber-950">Templates are not available yet</p>
        <p className="mt-2 text-sm text-stone-700">
          The platform is still configuring studio templates. Check back soon or contact support.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 max-w-2xl">
        <p className={ui.overline}>Studio template</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">
          Choose how your studio grows
        </h1>
        <p className="mt-3 text-sm text-stone-600 sm:text-base">
          Each option matches a different business model — pick one focus. Your classes, students, and sales stay intact.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {templates.map((t) => {
          const v = getBusinessTemplateVisuals(t.visualTheme);
          const isWearVisual = t.visualTheme === "wear";
          const studioRec = studioRecommendedSlug === t.slug;
          const showPlatformPick = !studioRec && t.isPlatformRecommended;
          const showFeatured = !studioRec && !showPlatformPick && t.isFeatured;
          const showDefault = !studioRec && !showPlatformPick && !showFeatured && defaultTemplateSlug === t.slug;

          return (
            <button
              key={t.slug}
              type="button"
              onClick={() => openPreview(t)}
              className="group text-left transition hover:scale-[1.01] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-800/30"
            >
              <article
                className={`flex h-full flex-col rounded-2xl border p-6 shadow-sm transition ${v.cardBorder} ${v.cardBg} ${v.cardHoverBorder} hover:shadow-md ${
                  currentSlug === t.slug ? `ring-2 ${v.ringActive}` : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h2 className={`text-lg font-semibold ${isWearVisual ? "text-white" : "text-amber-950"}`}>{t.name}</h2>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {studioRec ? (
                      <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-950">
                        Recommended for this studio
                      </span>
                    ) : null}
                    {showPlatformPick ? (
                      <span className="shrink-0 rounded-full bg-amber-200/90 px-2.5 py-0.5 text-xs font-medium text-amber-950">
                        Platform pick
                      </span>
                    ) : null}
                    {showFeatured ? (
                      <span className="shrink-0 rounded-full bg-stone-200 px-2.5 py-0.5 text-xs font-medium text-stone-800">
                        Featured
                      </span>
                    ) : null}
                    {showDefault ? (
                      <span className="shrink-0 rounded-full border border-stone-300 bg-white px-2.5 py-0.5 text-xs font-medium text-stone-700">
                        Default starter
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className={`mt-1 text-xs font-medium uppercase tracking-wide ${isWearVisual ? "text-neutral-400" : "text-stone-500"}`}>
                  {t.businessModelLabel}
                </p>
                <p className={`mt-2 text-sm font-medium ${isWearVisual ? "text-neutral-200" : "text-stone-800"}`}>{t.tagline}</p>
                <ul className={`mt-4 flex-1 space-y-2 text-sm ${isWearVisual ? "text-neutral-300" : "text-stone-600"}`}>
                  {t.bullets.filter(Boolean).map((b) => (
                    <li key={b} className="flex gap-2">
                      <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${v.bulletDot}`} aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <p className={`mt-6 text-sm font-semibold ${isWearVisual ? "text-amber-200" : "text-amber-950"}`}>
                  {money(t.priceCents, t.currency)} / month
                </p>
                <div
                  className={`${ui.buttonPrimary} mt-4 w-full justify-center sm:w-full pointer-events-none`}
                  aria-hidden
                >
                  {currentSlug === t.slug ? "View & update" : "Activate"}
                </div>
              </article>
            </button>
          );
        })}
      </div>

      {drawerOpen && selected ? (
        <div
          className="fixed inset-0 z-50 flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tmpl-drawer-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px] transition-opacity"
            aria-label="Close panel"
            onClick={closeDrawer}
          />
          <div className="relative flex h-full w-full max-w-full flex-col bg-white shadow-2xl md:max-w-lg md:shadow-xl">
            <div
              className={`flex items-center justify-between border-b px-4 py-4 sm:px-6 ${drawerVisual.compareNewBg} ${drawerVisual.compareNewBorder}`}
            >
              <h2 id="tmpl-drawer-title" className={`pr-4 text-lg font-semibold ${drawerVisual.compareNewLabel}`}>
                {phase === "success" ? "You’re set" : selected.name}
              </h2>
              <button
                type="button"
                onClick={closeDrawer}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-stone-600 hover:bg-white/80"
              >
                Close
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
              {phase === "preview" || phase === "confirm" ? (
                <>
                  <section className="border-b border-stone-100 pb-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Compare</p>
                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-4">
                        <p className="text-xs font-semibold text-stone-500">Your current setup</p>
                        <p className="mt-2 text-sm text-stone-800">{leftSummary}</p>
                      </div>
                      <div
                        className={`rounded-xl border p-4 ${drawerVisual.compareNewBorder} ${drawerVisual.compareNewBg}`}
                      >
                        <p className={`text-xs font-semibold ${drawerVisual.compareNewLabel}`}>New template</p>
                        <p className={`mt-2 text-sm ${selectedIsWear ? "text-neutral-200" : "text-stone-800"}`}>{rightSummary}</p>
                      </div>
                    </div>
                  </section>

                  <section className="border-b border-stone-100 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">What will change</p>
                    <ul className="mt-3 space-y-2 text-sm text-stone-700">
                      {selected.whatWillChange.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className={drawerVisual.compareNewLabel} aria-hidden>
                            ·
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="border-b border-stone-100 py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Expected impact</p>
                    <ul className="mt-3 space-y-2 text-sm text-stone-700">
                      {selected.expectedImpact.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="text-emerald-700" aria-hidden>
                            ·
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="py-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Safety</p>
                    <p className="mt-2 text-sm text-stone-700">
                      Your data stays intact. No classes or students are removed — we only change how your dashboard guides
                      you.
                    </p>
                  </section>

                  {error ? <p className="mb-4 text-sm font-medium text-red-700">{error}</p> : null}

                  {phase === "preview" ? (
                    <button type="button" className={ui.buttonPrimary} onClick={goConfirm}>
                      Activate · {money(selected.priceCents, selected.currency)}/month
                    </button>
                  ) : (
                    <div className="space-y-4">
                      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-800">
                        <p className="font-semibold text-amber-950">Confirm activation</p>
                        <p className="mt-2">
                          Activate <strong>{selected.name}</strong> at{" "}
                          <strong>{money(selected.priceCents, selected.currency)}</strong> per month (list price). Your choice
                          applies immediately; platform billing for templates follows your vendor agreement when enabled.
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          disabled={busy}
                          className={ui.buttonPrimary}
                          onClick={() => void activate()}
                        >
                          {busy ? "Applying…" : `Confirm — ${money(selected.priceCents, selected.currency)}/month`}
                        </button>
                        <button
                          type="button"
                          className={ui.buttonSecondary}
                          disabled={busy}
                          onClick={() => setPhase("preview")}
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="space-y-8">
                  <div>
                    <p className="text-xl font-semibold text-amber-950">
                      Your studio is now optimized for {selected.successGoalPhrase}
                    </p>
                    <p className="mt-2 text-sm text-stone-600">
                      Let’s complete your setup so you see results faster.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Next steps</p>
                    <ul className="mt-3 space-y-3 text-sm text-stone-800">
                      <li className="flex gap-2">
                        <span className="text-amber-700">○</span>
                        Create your next class
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-700">○</span>
                        Set your weekly schedule
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-700">○</span>
                        Adjust your pricing where it helps fill seats
                      </li>
                      <li className="flex gap-2">
                        <span className="text-amber-700">○</span>
                        Turn on reminders for students (recommended)
                      </li>
                    </ul>
                  </div>
                  <Link
                    href={`/dashboard/${studioId}`}
                    className={`${ui.buttonPrimary} inline-flex justify-center`}
                    onClick={closeDrawer}
                  >
                    Continue setup
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
