import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardFlatMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardFlatMeta(studioId, "Orders", "orders", "Customer orders.");
}

export default async function LegacyOrdersRedirect({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/commerce/orders`);
}
