"use client";

import { signOut } from "next-auth/react";
import { platformUi } from "@/lib/ui-styles";

export function AdminSignOut() {
  return (
    <button
      type="button"
      className={`${platformUi.buttonGhost} w-full justify-start`}
      onClick={() =>
        signOut({
          callbackUrl: `/login?callbackUrl=${encodeURIComponent("/admin")}`,
        })
      }
    >
      Sign out
    </button>
  );
}
