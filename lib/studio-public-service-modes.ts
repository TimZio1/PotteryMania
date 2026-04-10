export const PUBLIC_SERVICE_KEYS = ["classes", "shop", "contact"] as const;
export type PublicServiceKey = (typeof PUBLIC_SERVICE_KEYS)[number];

/** hidden = off (not on public page). */
export const SERVICE_MODES = ["hidden", "visible", "visible_link", "active"] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export type PublicServiceEntry = {
  mode: ServiceMode;
  linkUrl: string | null;
};

export type PublicServiceModesState = Record<PublicServiceKey, PublicServiceEntry>;

export const DEFAULT_PUBLIC_SERVICE_MODES: PublicServiceModesState = {
  classes: { mode: "active", linkUrl: null },
  shop: { mode: "active", linkUrl: null },
  contact: { mode: "active", linkUrl: null },
};

function isValidMode(m: unknown): m is ServiceMode {
  return typeof m === "string" && (SERVICE_MODES as readonly string[]).includes(m);
}

export function parsePublicServiceModes(json: unknown): PublicServiceModesState {
  const out: PublicServiceModesState = {
    classes: { ...DEFAULT_PUBLIC_SERVICE_MODES.classes },
    shop: { ...DEFAULT_PUBLIC_SERVICE_MODES.shop },
    contact: { ...DEFAULT_PUBLIC_SERVICE_MODES.contact },
  };
  if (!json || typeof json !== "object" || Array.isArray(json)) return out;
  const o = json as Record<string, unknown>;
  for (const key of PUBLIC_SERVICE_KEYS) {
    const entry = o[key];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const raw = entry as { mode?: unknown; linkUrl?: unknown };
    if (!isValidMode(raw.mode)) continue;
    const linkUrl =
      typeof raw.linkUrl === "string" && raw.linkUrl.trim() ? raw.linkUrl.trim().slice(0, 2048) : null;
    out[key] = { mode: raw.mode, linkUrl };
  }
  return out;
}

const LINK_PREFIX = /^(https?:\/\/|mailto:|tel:)/i;

export function isValidServiceLinkUrl(u: string): boolean {
  const t = u.trim();
  if (!t || t.length > 2048) return false;
  try {
    if (t.startsWith("mailto:") || t.startsWith("tel:")) return LINK_PREFIX.test(t);
    const parsed = new URL(t);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function validatePublicServiceModesInput(
  body: unknown,
): { ok: true; value: PublicServiceModesState } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "publicServiceModes must be an object" };
  }
  const o = body as Record<string, unknown>;
  const next: PublicServiceModesState = { ...DEFAULT_PUBLIC_SERVICE_MODES };

  for (const key of PUBLIC_SERVICE_KEYS) {
    const entry = o[key];
    if (entry === undefined) continue;
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      return { ok: false, error: `Invalid entry for ${key}` };
    }
    const raw = entry as { mode?: unknown; linkUrl?: unknown };
    if (!isValidMode(raw.mode)) {
      return { ok: false, error: `Invalid mode for ${key}` };
    }
    const linkUrl =
      typeof raw.linkUrl === "string" && raw.linkUrl.trim() ? raw.linkUrl.trim().slice(0, 2048) : null;
    if (raw.mode === "visible_link") {
      if (!linkUrl || !isValidServiceLinkUrl(linkUrl)) {
        return { ok: false, error: `${key}: visible with link requires a valid http(s), mailto, or tel URL` };
      }
    }
    next[key] = { mode: raw.mode, linkUrl: raw.mode === "visible_link" ? linkUrl : null };
  }
  return { ok: true, value: next };
}
