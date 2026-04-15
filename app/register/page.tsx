import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth-shell";
import { metaPublicPage } from "@/lib/seo-routes";
import { Spinner } from "@/components/ui/spinner";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = metaPublicPage(
  "Create account",
  "/register",
  "Create a PotteryMania account to sell your work, take bookings, and manage everything in one place.",
);

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create account"
      description="Choose a creator account to set up your shop or studio, or a customer account to browse and book."
    >
      <Suspense fallback={<div className="flex justify-center py-8"><Spinner /></div>}>
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
