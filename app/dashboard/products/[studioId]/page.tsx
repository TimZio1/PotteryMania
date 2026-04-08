import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardFlatMeta } from "@/lib/dashboard-metadata";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardFlatMeta(studioId, "Products", "products", "Product catalog admin.");
}

export default async function LegacyProductsRedirect({ params }: Props) {
  const { studioId } = await params;
  redirect(`/dashboard/${studioId}/shop`);
}
