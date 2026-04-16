import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(studioId, "Domains", "site/domains", "Custom storefront domain and DNS.");
}

/** Domain controls live on Settings until inlined here. */
export default async function StudioSiteDomainsPage({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/settings`);
}
