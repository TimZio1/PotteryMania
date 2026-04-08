import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Create account",
  "/register",
  "Register as a customer or studio on PotteryMania.",
);
import { RegisterForm } from "./register-form";

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      description="Join as a customer or register your studio to list products and classes."
    >
      <RegisterForm />
    </AuthShell>
  );
}
