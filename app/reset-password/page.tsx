import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import ResetPasswordInner from "./reset-password-inner";

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      description="Pick a strong password you haven’t used elsewhere. This link expires after one hour."
    >
      <Suspense fallback={<p className="text-center text-sm text-stone-500">Loading…</p>}>
        <ResetPasswordInner />
      </Suspense>
    </AuthShell>
  );
}
