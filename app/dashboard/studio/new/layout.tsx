import type { Metadata } from "next";
import type { ReactNode } from "react";
import { metaDashboardPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaDashboardPage(
  "New studio",
  "/dashboard/studio/new",
  "Quick setup for your studio — add products or classes and share your public page in minutes.",
);

/** Warm studio onboarding on paper — avoids inheriting dashboard platform zinc canvas for this flow only. */
export default function NewStudioLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className="min-h-[calc(100dvh-7rem)] w-full bg-background text-foreground antialiased"
      data-pm-visual="studio-onboarding"
    >
      {children}
    </div>
  );
}
