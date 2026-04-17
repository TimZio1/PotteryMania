import type { Metadata } from "next";
import { Suspense } from "react";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Reset password",
  "/reset-password",
  "Set a new password for your account.",
);
import { AuthShell } from "@/components/auth-shell";
import { Spinner } from "@/components/ui/spinner";
import ResetPasswordInner from "./reset-password-inner";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Pick a strong password you haven’t used elsewhere. This link expires after one hour."
    >
      <Suspense
        fallback={
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        }
      >
        <ResetPasswordInner />
      </Suspense>
    </AuthShell>
  );
}
