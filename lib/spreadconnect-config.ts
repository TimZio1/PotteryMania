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
 */
export type SpreadconnectConfig = {
  apiKey: string;
  baseUrl: string;
};

export function getSpreadconnectConfig(): SpreadconnectConfig | null {
  const apiKey = process.env.SPREADCONNECT_API_KEY?.trim() ?? "";
  if (apiKey === "__PENDING__") {
    console.warn("[spreadconnect] SPREADCONNECT_API_KEY is __PENDING__ — catalog sync and POD submit are disabled.");
    return null;
  }
  if (!apiKey) return null;

  const baseUrl = (
    process.env.SPREADCONNECT_API_BASE_URL?.trim() || "https://api.spreadconnect.app"
  ).replace(/\/$/, "");

  return { apiKey, baseUrl };
}
