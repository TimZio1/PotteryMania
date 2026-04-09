import { cookies, headers } from "next/headers";
import type { ShippingZone } from "@/lib/shipping-zones";
import { isShippingZone, normalizeCountryCode, zoneFromCountry } from "@/lib/shipping-zones";

export const REGION_COOKIE_KEY = "pm_region";

export async function resolveRequestShippingRegion(): Promise<{
  region: ShippingZone;
  country: string | null;
  source: "cookie" | "ip_country" | "default";
}> {
  const jar = await cookies();
  const fromCookie = jar.get(REGION_COOKIE_KEY)?.value;
  if (isShippingZone(fromCookie)) {
    return { region: fromCookie, country: null, source: "cookie" };
  }

  const h = await headers();
  const rawCountry = h.get("x-vercel-ip-country") || h.get("cf-ipcountry") || h.get("x-country-code");
  const country = normalizeCountryCode(rawCountry);
  if (country) {
    return { region: zoneFromCountry(country), country, source: "ip_country" };
  }
  return { region: "europe", country: null, source: "default" };
}
