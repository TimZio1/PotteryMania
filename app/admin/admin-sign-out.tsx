"use client";

import { signOut } from "next-auth/react";
import { ui } from "@/lib/ui-styles";

export function AdminSignOut() {
  return (
    <button
      type="button"
      className={`${ui.buttonGhost} text-stone-500`}
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
