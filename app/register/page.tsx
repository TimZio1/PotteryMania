import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { metaPublicPage } from "@/lib/seo-routes";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = metaPublicPage(
  "Create account",
  "/register",
  "Create a PotteryMania account to run your studio, sell work, and book classes.",
);

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      description="Choose a studio account to set up your business, or a customer account to shop and book."
    >
      <RegisterForm />
    </AuthShell>
  );
}
