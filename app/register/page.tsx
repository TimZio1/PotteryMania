import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { metaPublicPage } from "@/lib/seo-routes";
import { Spinner } from "@/components/ui/spinner";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = metaPublicPage(
  "Create account",
  "/register",
  "Create a free account — run your own studio, or buy from the studios you love.",
);

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      description="One free account. Use it to run a studio, or shop from studios you love."
    >
      <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
