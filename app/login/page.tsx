import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import LoginInner from "./login-inner";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" description="Access your studio dashboard, bookings, and saved cart on this device.">
      <Suspense
        fallback={<p className="text-center text-sm text-stone-500">Loading…</p>}
      >
        <LoginInner />
      </Suspense>
    </AuthShell>
  );
}
