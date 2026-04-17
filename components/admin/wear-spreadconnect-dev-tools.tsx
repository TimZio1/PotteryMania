"use client";

import { useCallback, useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";

export type WearBuilderJobAdminRow = {
  id: string;
  state: string;
  designImageUrl: string | null;
  createdAt: string;
  errorMessage: string | null;
  wearProductId: string | null;
};

const DEFAULT_PROBE_JSON = `{
  "action": "authentication"
}`;

type ProbeMeta = {
  probeEnabled?: boolean;
  spreadconnectConfigured?: boolean;
  supplierEnvironment?: string | null;
  baseUrl?: string | null;
};

export default function WearSpreadconnectDevTools({
  initialJobs,
}: {
  initialJobs: WearBuilderJobAdminRow[];
}) {
  const [probeJson, setProbeJson] = useState(DEFAULT_PROBE_JSON);
  const [probeResult, setProbeResult] = useState("");
  const [probeMeta, setProbeMeta] = useState<ProbeMeta | null>(null);
  const [probeBusy, setProbeBusy] = useState(false);
  const [jobs, setJobs] = useState(initialJobs);
  const [designUrl, setDesignUrl] = useState("");
  const [articleJson, setArticleJson] = useState("");
  const [wearProductId, setWearProductId] = useState("");
  const [jobBusy, setJobBusy] = useState(false);
  const [err, setErr] = useState("");

  const refreshMeta = useCallback(async () => {
    setErr("");
    const r = await fetch("/api/admin/wear-spreadconnect/probe", { method: "GET" });
    const j = (await r.json()) as ProbeMeta & { error?: string };
    if (!r.ok) {
      setErr((j as { error?: string }).error ?? "Failed to load probe metadata");
      return;
    }
    setProbeMeta(j);
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  const refreshJobs = useCallback(async () => {
    setErr("");
    const r = await fetch("/api/admin/wear-builder-jobs");
    const j = (await r.json()) as { jobs?: WearBuilderJobAdminRow[]; error?: string };
    if (!r.ok) {
      setErr(j.error ?? "Failed to list jobs");
      return;
    }
    if (j.jobs) {
      setJobs(
        j.jobs.map((row) => ({
          ...row,
          createdAt:
            typeof row.createdAt === "string"
              ? row.createdAt
              : new Date(row.createdAt as unknown as string).toISOString(),
        })),
      );
    }
  }, []);

  async function runProbePost() {
    setProbeBusy(true);
    setErr("");
    setProbeResult("");
    let parsed: unknown;
    try {
      parsed = JSON.parse(probeJson) as unknown;
    } catch {
      setErr("Probe body: invalid JSON");
      setProbeBusy(false);
      return;
    }
    const r = await fetch("/api/admin/wear-spreadconnect/probe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    });
    const text = await r.text();
    setProbeResult(text);
    setProbeBusy(false);
    if (!r.ok && !text) setErr(`Probe POST failed (${r.status})`);
  }

  async function enqueueJob() {
    setJobBusy(true);
    setErr("");
    let articleCreationPayload: unknown = null;
    const trimmed = articleJson.trim();
    if (trimmed) {
      try {
        articleCreationPayload = JSON.parse(trimmed) as unknown;
      } catch {
        setErr("Article payload: invalid JSON");
        setJobBusy(false);
        return;
      }
      if (
        articleCreationPayload == null ||
        typeof articleCreationPayload !== "object"
      ) {
        setErr("Article payload must be a JSON object");
        setJobBusy(false);
        return;
      }
    }

    const payload: Record<string, unknown> = {};
    if (designUrl.trim()) payload.designImageUrl = designUrl.trim();
    if (articleCreationPayload != null && typeof articleCreationPayload === "object") {
      payload.articleCreationPayload = articleCreationPayload;
    }
    if (wearProductId.trim()) payload.wearProductId = wearProductId.trim();

    const r = await fetch("/api/admin/wear-builder-jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = (await r.json()) as { error?: string; job?: WearBuilderJobAdminRow & { createdAt: Date | string } };
    setJobBusy(false);
    if (!r.ok) {
      setErr(j.error ?? "Enqueue failed");
      return;
    }
    if (j.job) {
      const createdAt =
        typeof j.job.createdAt === "string"
          ? j.job.createdAt
          : new Date(j.job.createdAt).toISOString();
      setJobs((prev) => [
        {
          id: j.job!.id,
          state: j.job!.state,
          designImageUrl: j.job!.designImageUrl ?? null,
          createdAt,
          errorMessage: j.job!.errorMessage ?? null,
          wearProductId: j.job!.wearProductId ?? null,
        },
        ...prev.filter((x) => x.id !== j.job!.id),
      ]);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50/60 px-4 py-4 text-sm text-stone-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-stone-900">Spreadconnect — dev tools</p>
          <p className="mt-1 text-xs text-stone-600">
            JSON runs the same routes as{" "}
            <span className="font-mono">/api/admin/wear-spreadconnect/probe</span>. Enqueue persists a{" "}
            <span className="font-mono">WearBuilderJob</span> (worker to be added). Use staging keys; respect 60 req/min.
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-50"
          onClick={() => {
            void refreshMeta();
            void refreshJobs();
          }}
        >
          Refresh metadata & jobs
        </button>
      </div>

      {probeMeta ? (
        <p className="mt-3 text-xs text-stone-600">
          Probe writes:{" "}
          <span className="font-mono">{probeMeta.probeEnabled ? "on" : "off"}</span>
          {" · "}
          API: <span className="font-mono">{probeMeta.spreadconnectConfigured ? "configured" : "not configured"}</span>
          {probeMeta.baseUrl ? (
            <>
              {" · "}
              <span className="font-mono" title={probeMeta.baseUrl ?? undefined}>
                {probeMeta.supplierEnvironment ?? "—"}
              </span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mt-2 text-xs text-stone-600">
          Load once:{" "}
          <button type="button" className="underline" onClick={() => void refreshMeta()}>
            fetch metadata
          </button>
        </p>
      )}

      {err ? <p className="mt-2 text-xs font-medium text-red-800">{err}</p> : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">POST probe</p>
          <textarea
            className="mt-2 h-40 w-full rounded-lg border border-stone-300 bg-white p-3 font-mono text-xs leading-relaxed text-stone-900"
            value={probeJson}
            onChange={(e) => setProbeJson(e.target.value)}
            spellCheck={false}
            aria-label="Spreadconnect probe JSON body"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={probeBusy || !probeMeta?.probeEnabled}
              onClick={() => void runProbePost()}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-semibold text-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {probeBusy ? <Spinner className="h-3 w-3" /> : null}
              POST probe
            </button>
            {!probeMeta?.probeEnabled ? (
              <span className="text-xs text-stone-600">
                Enable <span className="font-mono">SPREADCONNECT_PROBE_ENABLED=true</span> for POST.
              </span>
            ) : null}
          </div>
          {probeResult ? (
            <pre className="mt-3 max-h-56 overflow-auto rounded-lg border border-stone-200 bg-white p-3 font-mono text-[11px] text-stone-800">
              {probeResult}
            </pre>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Enqueue wear builder job</p>
          <label className="mt-2 block text-xs text-stone-600">Design image URL (https, optional)</label>
          <input
            type="url"
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs"
            value={designUrl}
            onChange={(e) => setDesignUrl(e.target.value)}
            placeholder="https://example.com/design.png"
          />
          <label className="mt-3 block text-xs text-stone-600">Article creation JSON (optional, OpenAPI shape)</label>
          <textarea
            className="mt-1 h-24 w-full rounded-lg border border-stone-300 bg-white p-2 font-mono text-xs"
            value={articleJson}
            onChange={(e) => setArticleJson(e.target.value)}
            spellCheck={false}
            placeholder="{}"
            aria-label="Article creation payload"
          />
          <label className="mt-2 block text-xs text-stone-600">Wear product ID (optional, links when set)</label>
          <input
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 font-mono text-xs"
            value={wearProductId}
            onChange={(e) => setWearProductId(e.target.value)}
            placeholder="uuid"
          />
          <button
            type="button"
            disabled={jobBusy}
            onClick={() => void enqueueJob()}
            className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-800/30 bg-amber-100/80 px-3 py-2 text-xs font-semibold text-amber-950 disabled:opacity-50"
          >
            {jobBusy ? <Spinner className="h-3 w-3" /> : null}
            Enqueue job
          </button>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-600">Recent jobs</p>
        {jobs.length === 0 ? (
          <p className="mt-2 text-xs text-stone-600">No jobs yet.</p>
        ) : (
          <ul className="mt-2 max-h-64 space-y-2 overflow-auto text-xs">
            {jobs.map((j) => (
              <li
                key={j.id}
                className="flex flex-wrap items-baseline gap-2 rounded-lg border border-stone-200/80 bg-white/80 px-2 py-1.5"
              >
                <span className="font-mono text-stone-900">{j.state}</span>
                <span className="text-stone-400">·</span>
                <span className="font-mono text-[10px] text-stone-600">{j.id}</span>
                <span className="text-stone-400">·</span>
                <time className="text-stone-600">{j.createdAt}</time>
                {j.designImageUrl ? (
                  <span className="ml-2 max-w-[200px] truncate text-stone-600" title={j.designImageUrl}>
                    {j.designImageUrl}
                  </span>
                ) : null}
                {j.errorMessage ? (
                  <span className="text-red-800" title={j.errorMessage}>
                    {j.errorMessage.slice(0, 80)}
                    {j.errorMessage.length > 80 ? "…" : ""}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
