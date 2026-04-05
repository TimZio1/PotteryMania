/** Normalize admin-only user tags: lowercase slugs, dedupe, cap count/length. */
export function normalizeAdminTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const x of raw) {
    if (typeof x !== "string") continue;
    let t = x.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-");
    t = t.replace(/^-|-$/g, "").slice(0, 32);
    if (t.length) out.add(t);
  }
  return [...out].slice(0, 20).sort();
}
