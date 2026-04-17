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
      title="Forgot password"
      description="Enter the email you use for your account. If we find an account with a password, we’ll email you a secure link."
    >
      <ForgotPasswordInner />
    </AuthShell>
  );
}
