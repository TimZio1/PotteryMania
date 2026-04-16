import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";

/** Dangerous / exploratory Spreadconnect write probes — gate with `SPREADCONNECT_PROBE_ENABLED=true` only. */
export function isSpreadconnectProbeEnabled(): boolean {
  return process.env.SPREADCONNECT_PROBE_ENABLED?.trim() === "true";
}

export async function spreadconnectProbeAuthentication(): Promise<{
  ok: boolean;
  status: number;
  json?: unknown;
  bodySnippet?: string;
}> {
  const cfg = getSpreadconnectConfig();
  if (!cfg) return { ok: false, status: 503, bodySnippet: "Spreadconnect not configured" };

  const res = await fetch(`${cfg.baseUrl}/authentication`, {
    method: "GET",
    headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return {
    ok: res.ok,
    status: res.status,
    json,
    bodySnippet: text.slice(0, 800),
  };
}

/**
 * `POST /designs/upload` with multipart field `url` (Spreadconnect downloads the image).
 * PNG requirements apply upstream — use a small public PNG URL for testing.
 */
export async function spreadconnectProbeDesignUploadFromUrl(imageUrl: string): Promise<{
  ok: boolean;
  status: number;
  json?: unknown;
  bodySnippet?: string;
}> {
  const cfg = getSpreadconnectConfig();
  if (!cfg) return { ok: false, status: 503, bodySnippet: "Spreadconnect not configured" };

  const fd = new FormData();
  fd.set("url", imageUrl.trim());

  const res = await fetch(`${cfg.baseUrl}/designs/upload`, {
    method: "POST",
    headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
    body: fd,
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return {
    ok: res.ok,
    status: res.status,
    json,
    bodySnippet: text.slice(0, 800),
  };
}

/** Forwards `ArticleCreation`-shaped JSON to `POST /articles` — tenant-specific IDs required. */
export async function spreadconnectProbeCreateArticle(body: unknown): Promise<{
  ok: boolean;
  status: number;
  json?: unknown;
  bodySnippet?: string;
}> {
  const cfg = getSpreadconnectConfig();
  if (!cfg) return { ok: false, status: 503, bodySnippet: "Spreadconnect not configured" };

  const res = await fetch(`${cfg.baseUrl}/articles`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-SPOD-ACCESS-TOKEN": cfg.apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = undefined;
  }
  return {
    ok: res.ok,
    status: res.status,
    json,
    bodySnippet: text.slice(0, 800),
  };
}
