/** Edge-safe helpers for vendor custom domains (no Node dns/crypto). */

export function vendorDomainTxtHostname(domainName: string): string {
  const d = normalizeDomainName(domainName);
  return `_potterymania.${d}`;
}

export function expectedVendorDomainTxtValue(token: string): string {
  return `pm-verify=${token}`;
}

export function normalizeDomainName(raw: string): string {
  let s = raw.trim().toLowerCase();
  if (s.endsWith(".")) s = s.slice(0, -1);
  return s;
}

const HOSTNAME_RE =
  /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$|^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;

export function isPlausiblePublicHostname(domain: string): boolean {
  const d = normalizeDomainName(domain);
  if (!d || d === "localhost" || d.endsWith(".local")) return false;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(d)) return false;
  return HOSTNAME_RE.test(d);
}

export function isLocalDevHostname(hostname: string | null | undefined): boolean {
  const d = normalizeDomainName(hostname ?? "");
  return !d || d === "localhost" || d === "127.0.0.1" || d.endsWith(".local");
}

/** Reject path/query injection and obviously invalid host shapes before DNS. */
export function parseVendorDomainInput(raw: string): string | null {
  const t = raw.trim();
  if (!t || /[\s/?#\\]/.test(t)) return null;
  const d = normalizeDomainName(t);
  if (!isPlausiblePublicHostname(d)) return null;
  return d;
}

export function stripPortFromHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const h = host.split(":")[0]?.trim().toLowerCase();
  return h || null;
}

export function primaryAppHostname(): string | null {
  const explicit = process.env.INTERNAL_APP_ORIGIN?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    try {
      return new URL(explicit.startsWith("http") ? explicit : `https://${explicit}`).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  const auth = process.env.AUTH_URL?.trim();
  if (auth) {
    try {
      return new URL(auth).hostname.toLowerCase();
    } catch {
      return null;
    }
  }
  return null;
}

export function vendorDomainConnectTargetHostname(): string | null {
  const host = primaryAppHostname();
  if (!host || isLocalDevHostname(host) || !isPlausiblePublicHostname(host)) return null;
  return host;
}

/** Origin (no trailing slash) for server-side fetch to the resolve API from Edge middleware. */
export function vendorDomainResolveFetchBaseUrl(): string | null {
  const internal = process.env.INTERNAL_APP_ORIGIN?.trim();
  if (internal) {
    const u = internal.startsWith("http") ? internal : `https://${internal}`;
    try {
      return new URL(u).origin;
    } catch {
      return null;
    }
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    const u = site.startsWith("http") ? site : `https://${site}`;
    try {
      return new URL(u).origin;
    } catch {
      return null;
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`).origin;
    } catch {
      return null;
    }
  }
  return null;
}

/** Canonical public site origin for redirecting off vendor hosts (no trailing slash). */
export function canonicalPublicOrigin(): string | null {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      const u = new URL(site.startsWith("http") ? site : `https://${site}`);
      return u.origin;
    } catch {
      return null;
    }
  }
  const auth = process.env.AUTH_URL?.trim();
  if (auth) {
    try {
      const u = new URL(auth);
      return u.origin;
    } catch {
      return null;
    }
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    try {
      return new URL(`https://${vercel}`).origin;
    } catch {
      return null;
    }
  }
  return null;
}

export function vendorDomainCanonicalOrigin(): string | null {
  const origin = canonicalPublicOrigin();
  if (!origin) return null;
  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (isLocalDevHostname(host) || !isPlausiblePublicHostname(host)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function vendorDomainSetupReady(): boolean {
  return Boolean(vendorDomainConnectTargetHostname() && vendorDomainCanonicalOrigin() && vendorDomainResolveFetchBaseUrl());
}
