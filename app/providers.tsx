"use client";

import { SessionProvider } from "next-auth/react";
import { useEffect } from "react";
import { initMonitoring } from "@/lib/monitoring";

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initMonitoring();
  }, []);
  return <SessionProvider>{children}</SessionProvider>;
}