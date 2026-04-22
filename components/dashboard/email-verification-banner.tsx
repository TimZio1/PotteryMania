"use client";

import { useState } from "react";
import { platformUi } from "@/lib/ui-styles";

export function EmailVerificationBanner({ email }: { email: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    setMsg(null);
    try {
      const r = await fetch("/api/auth/resend-verification", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { alreadyVerified?: boolean; error?: string };
      if (r.status === 429) {
        setMsg("Wait a few minutes, then try again.");
      } else if (j.alreadyVerified) {
        setMsg("Already verified. Refresh the page.");
      } else if (r.ok) {
        setMsg("Check your inbox for a new link.");
      } else {
        setMsg(typeof j.error === "string" ? j.error : "We couldn’t send the email. Try again.");
      }
    } catch {
      setMsg("We couldn’t send the email. Try again.");
    }
    setPending(false);
  }

  return (
    <div className="border-b border-amber-300/70 bg-amber-50/90 px-4 py-3 text-sm text-stone-700">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed text-[var(--foreground)]">
          <strong className="font-semibold text-[var(--foreground)]">Verify your email</strong> — We sent a link to{" "}
          <span className="rounded bg-white px-1 font-mono text-xs text-stone-900 shadow-(--pm-shadow-rest)">{email}</span>. Confirm it so we can reach
          you about orders and bookings.
        </p>
        <button type="button" onClick={resend} disabled={pending} className={`${platformUi.buttonSecondary} shrink-0`}>
          {pending ? "Sending…" : "Resend email"}
        </button>
      </div>
      {msg ? <p className="mx-auto mt-2 max-w-5xl text-xs text-[var(--muted)]">{msg}</p> : null}
    </div>
  );
}
