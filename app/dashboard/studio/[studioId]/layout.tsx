import type { Metadata } from "next";
import type { ReactNode } from "react";
import { dashboardFlatMeta } from "@/lib/dashboard-metadata";

type Props = { children: ReactNode; params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardFlatMeta(studioId, "Studio profile", "studio", "Edit studio profile, Stripe Connect, and activation.");
}

export default function StudioEditLayout({ children }: { children: ReactNode }) {
  return children;
}
