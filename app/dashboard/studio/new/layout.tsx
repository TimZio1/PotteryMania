import type { Metadata } from "next";
import type { ReactNode } from "react";
import { metaDashboardPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaDashboardPage(
  "New studio",
  "/dashboard/studio/new",
  "Quick setup for your studio — add products or classes and share your public page in minutes.",
);

export default function NewStudioLayout({ children }: { children: ReactNode }) {
  return children;
}
