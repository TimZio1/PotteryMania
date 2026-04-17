"use client";

import { signOut } from "next-auth/react";
import { platformUi } from "@/lib/ui-styles";

export function AdminSignOut() {
  return (
    <button
      type="button"
      className={`${platformUi.buttonGhost} w-full justify-start !text-stone-800 hover:!bg-stone-200/80 hover:!text-stone-950`}
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
