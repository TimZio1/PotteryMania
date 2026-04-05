"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { ImpersonationBanner } from "@/components/dashboard/impersonation-banner";
import { initMonitoring } from "@/lib/monitoring";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initMonitoring();
  }, []);
  return (
    <SessionProvider>
      <ImpersonationBanner />
      {children}
    </SessionProvider>
  );
}