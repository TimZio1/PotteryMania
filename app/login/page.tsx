import type { Metadata } from "next";
import { Suspense } from "react";
import { metaPublicPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaPublicPage(
  "Sign in",
  "/login",
  "Sign in to run your studio or check in on your orders.",
);
import { AuthShell } from "@/components/auth-shell";
import { Spinner } from "@/components/ui/spinner";
import LoginInner from "./login-inner";

export default function LoginPage() {
  return (
    <AuthShell title="Sign in" description="One account for your studio, your orders, and your classes.">
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
