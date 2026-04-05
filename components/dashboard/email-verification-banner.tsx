"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function EmailVerificationBanner({ email }: { email: string }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function resend() {
    setPending(true);
    setMsg(null);
    try {
      const r = await fetch("/api/auth/resend-verification", { method: "POST" });
      const j = (await r.json().catch(() => ({}))) as { alreadyVerified?: boolean };
      if (r.status === 429) {
        setMsg("Please wait a few minutes before trying again.");
      } else if (j.alreadyVerified) {
        setMsg("Your email is already verified — refresh the page.");
      } else if (r.ok) {
        setMsg("Check your inbox (and spam) for a new verification link.");
      } else {
        setMsg("Could not send. Try again later.");
      }
    } catch {
      setMsg("Could not send. Try again later.");
    }
    setPending(false);
  }

  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed">
          <strong>Verify your email</strong> — We sent a link to{" "}
          <span className="rounded bg-white/60 px-1 font-mono text-xs">{email}</span>. Confirm it so we can reliably
          reach you about orders and bookings.
        </p>
        <button type="button" onClick={resend} disabled={pending} className={`${ui.buttonSecondary} shrink-0`}>
          {pending ? "Sending…" : "Resend email"}
        </button>
      </div>
      {msg ? <p className="mx-auto mt-2 max-w-5xl text-xs text-amber-900">{msg}</p> : null}
    </div>
  );
}
