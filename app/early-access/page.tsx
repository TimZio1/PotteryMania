import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { buildMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Get started",
    description:
      "Run your creative business online. Sell your work, book your classes, manage everything in one system. Official launch 1 May 2026.",
    path: "/early-access",
  });
}

export default function EarlyAccessPage() {
  redirect("/dashboard/studio/new?setup=both");
}
