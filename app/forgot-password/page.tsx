import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Forgot password",
  "/forgot-password",
  "Request a secure link to reset your password.",
);
import ForgotPasswordInner from "./forgot-password-inner";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="We email a reset link if this address has an account."
    >
      <ForgotPasswordInner />
    </AuthShell>
  );
}
