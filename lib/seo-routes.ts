import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

const adminRobots: Metadata = { robots: { index: false, follow: false } };

/** Hyperadmin pages — not indexed, explicit titles for tabs and sharing. */
export function metaAdminPage(title: string, path: string, description: string): Metadata {
  return {
    ...buildMetadata({
      title: `${title} · Hyperadmin`,
      description,
      path,
    }),
    ...adminRobots,
  };
}

/** Vendor / customer dashboard (signed-in). */
export function metaDashboardPage(title: string, path: string, description: string): Metadata {
  return buildMetadata({
    title: `${title} · Dashboard`,
    description,
    path,
  });
}

export function metaPublicPage(title: string, path: string, description: string): Metadata {
  return buildMetadata({ title, description, path });
}
