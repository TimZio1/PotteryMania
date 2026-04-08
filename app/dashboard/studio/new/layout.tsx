import type { Metadata } from "next";
import type { ReactNode } from "react";
import { metaDashboardPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaDashboardPage(
  "New studio",
  "/dashboard/studio/new",
  "Create your ceramic studio profile for PotteryMania review and onboarding.",
);

export default function NewStudioLayout({ children }: { children: ReactNode }) {
  return children;
}
