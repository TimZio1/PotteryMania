/**
 * Spreadconnect (SPOD) REST API — https://api.spreadconnect.app/docs/
 * Auth header: X-SPOD-ACCESS-TOKEN
 *
 * Catalog sync throttling (optional env):
 * - `SPREADCONNECT_SYNC_PAGE_LIMIT` — list page size (default 25, max 100).
 * - `SPREADCONNECT_SYNC_DISCOVER_MAX_PAGES` — list pages per sync when not doing a full scan (default 1).
 * - `SPREADCONNECT_REQUEST_GAP_MS` — pause between GET /articles/{id} calls (default 250).
 * - `SPREADCONNECT_PAGE_GAP_MS` — pause between list pages (default 400).
 * - `SPREADCONNECT_SYNC_FULL_DISCOVERY=1` — cron/admin default: paginate entire catalog (heavy).
 * - `SPREADCONNECT_PROBE_ENABLED=true` — allow hyperadmin `POST /api/admin/wear-spreadconnect/probe` (staging / controlled use).
 */
export type SpreadconnectConfig = {
  apiKey: string;
  baseUrl: string;
  orderTimeoutMs: number;
  supplierEnvironment: "staging" | "production";
  liveSubmissionAllowed: boolean;
};

function clampInt(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

export function getSpreadconnectConfig(): SpreadconnectConfig | null {
  const apiKey = process.env.SPREADCONNECT_API_KEY?.trim() ?? "";
  if (apiKey === "__PENDING__") {
    console.warn("[spreadconnect] SPREADCONNECT_API_KEY is __PENDING__ — catalog sync and paid order submit are disabled.");
    return null;
  }
  if (!apiKey) return null;

  const baseUrl = (
    process.env.SPREADCONNECT_API_BASE_URL?.trim() || "https://api.spreadconnect.app"
  ).replace(/\/$/, "");

  const orderTimeoutMs = clampInt(process.env.SPREADCONNECT_ORDER_TIMEOUT_MS, 20_000, 5_000, 120_000);
  const supplierEnvironment = process.env.SPREADCONNECT_ENV?.trim().toLowerCase() === "production" ? "production" : "staging";
  const appIsProduction = process.env.NODE_ENV === "production";
  const liveSubmissionAllowed =
    supplierEnvironment === "production" &&
    appIsProduction &&
    process.env.SPREADCONNECT_ALLOW_LIVE_SUBMISSION === "true";

  return { apiKey, baseUrl, orderTimeoutMs, supplierEnvironment, liveSubmissionAllowed };
}
