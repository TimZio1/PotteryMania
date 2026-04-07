import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { Spinner } from "@/components/ui/spinner";
import LoginInner from "./login-inner";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" description="Access your studio dashboard, bookings, and saved cart on this device.">
      <Suspense
        fallback={
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        }
      >
        <LoginInner />
      </Suspense>
    </AuthShell>
  );
}
