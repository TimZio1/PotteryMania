import type { Metadata } from "next";
import { AuthShell } from "@/components/auth-shell";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Forgot password",
  "/forgot-password",
  "We’ll email you a link to set a new password.",
);
import ForgotPasswordInner from "./forgot-password-inner";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      description="Enter your email. If we have an account for it, a reset link is on its way."
    >
      <ForgotPasswordInner />
    </AuthShell>
  );
}
