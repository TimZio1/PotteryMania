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
        setMsg("Please wait a few minutes before trying again.");
      } else if (j.alreadyVerified) {
        setMsg("Your email is already verified — refresh the page.");
      } else if (r.ok) {
        setMsg("Check your inbox (and spam) for a new verification link.");
      } else {
        setMsg(typeof j.error === "string" ? j.error : "We couldn’t send your verification email. Please try again.");
      }
    } catch {
      setMsg("Could not send. Try again later.");
    }
    setPending(false);
  }

  return (
    <div className="border-b border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-zinc-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="leading-relaxed text-zinc-200">
          <strong className="font-semibold text-zinc-50">Verify your email</strong> — We sent a link to{" "}
          <span className="rounded bg-black/30 px-1 font-mono text-xs text-zinc-100">{email}</span>. Confirm it so we can
          reliably reach you about orders and bookings.{" "}
          <span className="text-zinc-400">Didn&apos;t receive it?</span> Use the button — we rate-limit resends to
          protect your inbox.
        </p>
        <button type="button" onClick={resend} disabled={pending} className={`${platformUi.buttonSecondary} shrink-0`}>
          {pending ? "Sending…" : "Resend email"}
        </button>
      </div>
      {msg ? <p className="mx-auto mt-2 max-w-5xl text-xs text-zinc-400">{msg}</p> : null}
    </div>
  );
}
