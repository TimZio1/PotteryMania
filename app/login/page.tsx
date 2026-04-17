import type { Metadata } from "next";
import { Suspense } from "react";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Sign in",
  "/login",
  "Sign in to your studio dashboard or customer account.",
);
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
