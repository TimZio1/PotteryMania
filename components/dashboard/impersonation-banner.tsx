"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function ImpersonationBanner() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const adminEmail = session?.user?.impersonatorEmail;
  const impersonating = Boolean(session?.user?.impersonatorId);

  if (!impersonating || !adminEmail) return null;

  async function exit() {
    setBusy(true);
    try {
      await update({ endImpersonation: true });
      router.push("/admin/users");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-b border-amber-800/40 bg-amber-950 px-4 py-2 text-center text-sm text-amber-50">
      <span className="font-medium">Viewing as {session?.user?.email}</span>
      <span className="mx-2 text-amber-200/80">·</span>
      <span className="text-amber-100/90">Signed in as admin {adminEmail}</span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void exit()}
        className={`${ui.buttonSecondary} ml-4 inline-flex min-h-9 border-amber-100/40 bg-amber-900/50 px-3 py-1 text-xs text-amber-50 hover:bg-amber-900`}
      >
        {busy ? "…" : "Exit impersonation"}
      </button>
    </div>
  );
}
