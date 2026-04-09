export const SHIPPING_ZONES = ["domestic", "europe", "usa", "canada", "asia"] as const;

export type ShippingZone = (typeof SHIPPING_ZONES)[number];

type ShippingZoneFieldMap = {
  shippingDomesticCents: number | null;
  shippingEuropeCents: number | null;
  shippingUsaCents: number | null;
  shippingCanadaCents: number | null;
  shippingAsiaCents: number | null;
};

const EUROPE_COUNTRY_CODES = new Set([
  "AL","AD","AM","AT","AZ","BY","BE","BA","BG","HR","CY","CZ","DK","EE","FI","FR","GE","DE","GI","GR","HU","IS","IE","IT","XK","LV","LI","LT","LU","MT","MD","MC","ME","NL","MK","NO","PL","PT","RO","SM","RS","SK","SI","ES","SE","CH","TR","UA","GB","VA",
]);

const ASIA_COUNTRY_CODES = new Set([
  "AF","BH","BD","BT","BN","KH","CN","HK","IN","ID","IR","IQ","IL","JP","JO","KZ","KW","KG","LA","LB","MO","MY","MV","MN","MM","NP","KP","OM","PK","PS","PH","QA","SA","SG","KR","LK","SY","TW","TJ","TH","TL","TM","AE","UZ","VN","YE",
]);

export function normalizeCountryCode(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const code = value.trim().toUpperCase();
  return code.length >= 2 ? code.slice(0, 2) : null;
}

export function isShippingZone(value: unknown): value is ShippingZone {
  return typeof value === "string" && (SHIPPING_ZONES as readonly string[]).includes(value);
}

export function zoneFromCountry(countryCode: string | null | undefined): ShippingZone {
  const code = normalizeCountryCode(countryCode);
  if (code === "US") return "usa";
  if (code === "CA") return "canada";
  if (code && EUROPE_COUNTRY_CODES.has(code)) return "europe";
  if (code && ASIA_COUNTRY_CODES.has(code)) return "asia";
  return "europe";
}

export function resolveShippingZoneForDestination(args: {
  destinationCountry: string | null | undefined;
  studioCountry: string | null | undefined;
}): ShippingZone {
  const destination = normalizeCountryCode(args.destinationCountry);
  const studio = normalizeCountryCode(args.studioCountry);
  if (destination && studio && destination === studio) return "domestic";
  return zoneFromCountry(destination);
}

export function zonePriceCents(
  row: ShippingZoneFieldMap,
  zone: ShippingZone,
): number | null {
  if (zone === "domestic") return row.shippingDomesticCents;
  if (zone === "europe") return row.shippingEuropeCents;
  if (zone === "usa") return row.shippingUsaCents;
  if (zone === "canada") return row.shippingCanadaCents;
  return row.shippingAsiaCents;
}

export function shipsToZone(row: ShippingZoneFieldMap, zone: ShippingZone): boolean {
  const cents = zonePriceCents(row, zone);
  return typeof cents === "number" && cents >= 0;
}

export type ParsedShippingZones = ShippingZoneFieldMap;

export function parseShippingZonesInput(raw: unknown): { ok: true; value: ParsedShippingZones } | { ok: false; error: string } {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const parseCents = (k: string): number | null | "invalid" => {
    const v = obj[k];
    if (v == null || v === "") return null;
    if (typeof v !== "number" || !Number.isFinite(v)) return "invalid";
    const n = Math.floor(v);
    if (n < 0 || n > 2_000_000_00) return "invalid";
    return n;
  };
  const domestic = parseCents("domestic");
  const europe = parseCents("europe");
  const usa = parseCents("usa");
  const canada = parseCents("canada");
  const asia = parseCents("asia");
  if ([domestic, europe, usa, canada, asia].includes("invalid")) {
    return { ok: false, error: "shippingZones values must be integer cents between 0 and 200000000 (or null)." };
  }
  return {
    ok: true,
    value: {
      shippingDomesticCents: domestic as number | null,
      shippingEuropeCents: europe as number | null,
      shippingUsaCents: usa as number | null,
      shippingCanadaCents: canada as number | null,
      shippingAsiaCents: asia as number | null,
    },
  };
}
