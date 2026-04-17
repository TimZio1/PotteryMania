"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import type { InsightFullAnalysisJson } from "@/lib/ai/insight-engine";
import type { StudioInsightListItemDto } from "@/lib/ai/ensure-studio-insights";

function isAnalysis(v: unknown): v is InsightFullAnalysisJson {
  return (
    typeof v === "object" &&
    v !== null &&
    "diagnosis" in v &&
    "recommendations" in v &&
    Array.isArray((v as InsightFullAnalysisJson).recommendations)
  );
}

export default function StudioMonetizedInsightsPanel({
  studioId,
  initialInsights,
  variant = "full",
}: {
  studioId: string;
  initialInsights: StudioInsightListItemDto[];
  /** compact = teaser strip on dashboard; unlock happens on the full AI page */
  variant?: "full" | "compact";
}) {
  const allowUnlock = variant === "full";
  const router = useRouter();
  const [items, setItems] = useState(initialInsights);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(initialInsights);
  }, [initialInsights]);

  async function refresh() {
    const res = await fetch(`/api/studios/${studioId}/insights`);
    if (!res.ok) return;
    const data = (await res.json()) as { insights?: StudioInsightListItemDto[] };
    if (data.insights) setItems(data.insights);
  }

  async function onUnlock(id: string) {
    setBusyId(id);
    setError(null);
    const res = await fetch(`/api/studios/${studioId}/insights/${id}/purchase`, { method: "POST" });
    const data = (await res.json()) as { checkoutUrl?: string; error?: string };
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Checkout failed");
      return;
    }
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
    }
  }

  async function onDismiss(id: string) {
    setBusyId(id);
    await fetch(`/api/studios/${studioId}/insights/${id}/dismiss`, { method: "POST" });
    setBusyId(null);
    await refresh();
    router.refresh();
  }

  async function markViewed(id: string) {
    await fetch(`/api/studios/${studioId}/insights/${id}/view`, { method: "POST" });
  }

  async function logAction(id: string, actionType: "applied" | "viewed_editor" | "deferred", metadata?: object) {
    await fetch(`/api/studios/${studioId}/insights/${id}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionType, metadata }),
    });
  }

  if (items.length === 0) {
    return (
      <div className={cn(ui.cardMuted, "text-sm text-[var(--muted)]")}>
        {variant === "full" ? (
          <>
            <p className="font-medium text-[var(--foreground)]">No insight cards yet</p>
            <p className="mt-2">
              Cards appear when your studio has enough recent class and booking data, and when anonymized benchmarks are
              available (e.g. pricing comparison needs several other studios in your country).
            </p>
          </>
        ) : (
          <p>Insights will appear here when the system has enough data.</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {items.map((row) => {
        const purchased = row.status === "purchased";
        const analysis = purchased && isAnalysis(row.fullAnalysis) ? row.fullAnalysis : null;
        const priceLabel = `€${(row.priceCents / 100).toFixed(2)}`;

        return (
          <div key={row.id} id={`insight-${row.id}`} className={cn(ui.card, "scroll-mt-24")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{row.category}</p>
                <h3 className="mt-1 text-base font-semibold text-[var(--foreground)]">{row.previewTitle}</h3>
                <p className="mt-2 text-sm text-[var(--foreground)]">{row.previewHook}</p>
                {row.potentialBenefit ? (
                  <p className="mt-2 text-xs font-medium text-amber-900">{row.potentialBenefit}</p>
                ) : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                {!purchased && (row.status === "generated" || row.status === "viewed") ? (
                  allowUnlock ? (
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void onUnlock(row.id)}
                      className={cn(ui.buttonPrimary, "whitespace-nowrap text-sm")}
                    >
                      {busyId === row.id ? "…" : `Unlock — ${priceLabel}`}
                    </button>
                  ) : (
                    <Link
                      href={`/dashboard/${studioId}/ai#insight-${row.id}`}
                      className={cn(ui.buttonSecondary, "whitespace-nowrap text-sm")}
                    >
                      Unlock ({priceLabel})
                    </Link>
                  )
                ) : null}
                {purchased ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
                    Unlocked
                  </span>
                ) : null}
              </div>
            </div>

            <p className="mt-3 text-xs text-[var(--muted)]">
              Based on your studio data
              {row.benchmarkSampleSize != null ? ` · sample n≈${row.benchmarkSampleSize}` : ""}
              {row.confidenceScore != null ? ` · model confidence ${Math.round(row.confidenceScore * 100)}%` : ""}
              {row.expiresAt ? ` · refreshes after ${row.expiresAt.slice(0, 10)}` : ""}
            </p>

            {allowUnlock && !purchased && (row.status === "generated" || row.status === "viewed") ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={cn(ui.buttonGhost, "text-xs")}
                  disabled={busyId === row.id}
                  onClick={() => {
                    void markViewed(row.id);
                    void onDismiss(row.id);
                  }}
                >
                  Dismiss
                </button>
              </div>
            ) : null}

            {!allowUnlock && purchased ? (
              <Link
                href={`/dashboard/${studioId}/ai#insight-${row.id}`}
                className="mt-4 inline-block text-sm font-medium text-amber-900 underline"
              >
                View full analysis
              </Link>
            ) : null}

            {analysis && allowUnlock ? (
              <div className="mt-6 space-y-4 border-t border-stone-100 pt-4 text-sm text-[var(--foreground)]">
                <section>
                  <p className="text-xs font-semibold uppercase text-[var(--muted)]">Diagnosis</p>
                  <p className="mt-1">{analysis.diagnosis}</p>
                </section>
                <section>
                  <p className="text-xs font-semibold uppercase text-[var(--muted)]">Benchmark</p>
                  <p className="mt-1">{analysis.benchmark}</p>
                </section>
                <section>
                  <p className="text-xs font-semibold uppercase text-[var(--muted)]">Recommendations</p>
                  <ul className="mt-1 list-inside list-disc space-y-1">
                    {analysis.recommendations.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>
                <section>
                  <p className="text-xs font-semibold uppercase text-[var(--muted)]">Projection</p>
                  <p className="mt-1">{analysis.projection}</p>
                </section>
                <section>
                  <p className="text-xs font-semibold uppercase text-[var(--muted)]">Confidence</p>
                  <p className="mt-1">{analysis.confidenceNote}</p>
                </section>
                {analysis.actions?.length ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {analysis.actions.map((a) => (
                      <Link
                        key={a.href}
                        href={a.href}
                        className={cn(ui.buttonSecondary, "text-xs")}
                        onClick={() => void logAction(row.id, "viewed_editor", { href: a.href, label: a.label })}
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}

      {variant === "compact" ? (
        <p className="text-center text-xs text-[var(--muted)]">
          <Link href={`/dashboard/${studioId}/ai`} className="text-amber-900 underline">
            Open AI Advisor for unlock &amp; details
          </Link>
        </p>
      ) : null}
    </div>
  );
}
