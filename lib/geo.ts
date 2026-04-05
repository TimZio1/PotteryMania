/** Great-circle distance between two WGS84 points (kilometres). */
export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export type NearQuery = {
  lat: number;
  lng: number;
  radiusKm: number;
};

/** Parse `lat`, `lng`, and optional `radius` (km, default 50, clamped 1–500). */
export function parseNearQueryFromParams(sp: Record<string, string | string[] | undefined>): NearQuery | null {
  const latRaw = typeof sp.lat === "string" ? sp.lat.trim() : "";
  const lngRaw = typeof sp.lng === "string" ? sp.lng.trim() : "";
  if (!latRaw || !lngRaw) return null;
  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;

  const rRaw = typeof sp.radius === "string" ? sp.radius.trim() : "";
  const radiusParsed = rRaw ? parseFloat(rRaw) : 50;
  const radiusKm = Number.isFinite(radiusParsed)
    ? Math.min(500, Math.max(1, radiusParsed))
    : 50;

  return { lat, lng, radiusKm };
}
