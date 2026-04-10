import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Registration closed",
  "/register",
  "New account registration is currently closed.",
);

export default function RegisterPage() {
  redirect("/login");
}
