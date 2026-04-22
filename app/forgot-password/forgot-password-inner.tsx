"use client";

import Link from "next/link";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export default function ForgotPasswordInner() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setPending(true);
    try {
      const r = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (r.status === 429) {
        setErr("A few too many tries. Wait a few minutes, then try again.");
        setPending(false);
        return;
      }
      if (!r.ok) {
        setErr("We couldn’t send the email. Try again.");
        setPending(false);
        return;
      }
      setDone(true);
    } catch {
      setErr("We couldn’t send the email. Try again.");
    }
    setPending(false);
  }

  if (done) {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-relaxed text-stone-700">
          If we have an account for that email, a reset link is on its way. Check your inbox (and your spam folder, just in case).
        </p>
        <Link href="/login" className={`${ui.buttonSecondary} inline-flex w-full justify-center`}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <div>
        <label className={ui.label} htmlFor="forgot-email">
          Email
        </label>
        <input
          id="forgot-email"
          className={`${ui.input} mt-2`}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={pending}
        />
      </div>
      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Sending…" : "Send me the reset link"}
      </button>
      <p className="text-center text-sm text-stone-600">
        <Link href="/login" className="font-medium text-amber-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
