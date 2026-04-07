/**
 * Spreadconnect (SPOD) REST API — https://api.spreadconnect.app/docs/
 * Auth header: X-SPOD-ACCESS-TOKEN
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
