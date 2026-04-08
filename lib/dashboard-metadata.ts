import type { Metadata } from "next";
import { metaDashboardPage } from "@/lib/seo-routes";

export function dashboardStudioMeta(
  studioId: string,
  title: string,
  /** e.g. "calendar" or "" for studio root */
  segment: string,
  description: string,
): Metadata {
  const path = segment ? `/dashboard/${studioId}/${segment}` : `/dashboard/${studioId}`;
  return metaDashboardPage(title, path, description);
}

export function dashboardFlatMeta(
  studioId: string,
  title: string,
  /** e.g. "bookings" -> /dashboard/bookings/:id */
  prefix: string,
  description: string,
): Metadata {
  return metaDashboardPage(title, `/dashboard/${prefix}/${studioId}`, description);
}
