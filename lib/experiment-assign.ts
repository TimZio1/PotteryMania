/**
 * Tier 4F: deterministic A/B assignment without storing rows (good enough for flagging UI copy).
 */
export function experimentVariantForSubject(
  experimentSlug: string,
  subjectId: string,
  variantBPercent: number,
): "a" | "b" {
  const pct = Math.min(100, Math.max(0, Math.floor(variantBPercent)));
  let h = 0;
  const str = `${experimentSlug}:${subjectId}`;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  const bucket = h % 100;
  return bucket < pct ? "b" : "a";
}
