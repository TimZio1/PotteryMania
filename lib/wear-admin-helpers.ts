/** Split newline- or comma-separated absolute image URLs for admin forms. */
export function parseWearImageUrlsFromMultiline(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(/[\n,]+/)) {
    const s = part.trim();
    if (!s || seen.has(s)) continue;
    if (!/^https?:\/\//i.test(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
}
