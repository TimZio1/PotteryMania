"use client";

import { signOut } from "next-auth/react";
import { ui } from "@/lib/ui-styles";

export function SessionRefreshActions() {
  return (
    <button
      type="button"
      className={`${ui.buttonSecondary} mt-4 w-full sm:w-auto`}
      onClick={() =>
        signOut({
          callbackUrl: `/login?callbackUrl=${encodeURIComponent("/admin")}`,
        })
      }
    >
      Sign out, then sign in again
    </button>
  );
}
