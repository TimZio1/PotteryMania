import type { ReactNode } from "react";
import { PlatformHeader } from "./platform-header";

type Props = {
  children: ReactNode;
  /** `account` = slightly smaller nav (my bookings, account, waitlist). */
  headerVariant?: "dashboard" | "account";
};

/**
 * Full-page **platform** wrapper for routes outside `app/dashboard/layout.tsx`
 * (e.g. `/my-bookings`, `/account`) so they stay on system chrome, not marketing/studio warmth.
 */
export function PlatformChrome({ children, headerVariant = "account" }: Props) {
  return (
    <div
      className="pm-visual-platform flex min-h-screen flex-col bg-zinc-950 text-zinc-100 antialiased"
      data-pm-visual="platform"
    >
      <PlatformHeader variant={headerVariant} />
      {children}
    </div>
  );
}
