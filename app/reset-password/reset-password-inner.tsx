"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { ui } from "@/lib/ui-styles";

export default function ResetPasswordInner() {
  const sp = useSearchParams();
  const tokenFromUrl = useMemo(() => sp.get("token")?.trim() ?? "", [sp]);
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (password.length < 8) {
      setErr("Use at least 8 characters.");
      return;
    }
    if (password !== password2) {
      setErr("Those two passwords don’t match.");
      return;
    }
    if (!tokenFromUrl) {
      setErr("That reset link is missing. Open the link from your email, or request a new one.");
      return;
    }
    setPending(true);
    try {
      const r = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenFromUrl, password }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.status === 429) {
        setErr("A few too many tries. Wait a few minutes, then try again.");
        setPending(false);
        return;
      }
      if (!r.ok) {
        setErr(data.error || "We couldn’t reset your password. The link may have expired.");
        setPending(false);
        return;
      }
      setDone(true);
    } catch {
      setErr("Something went wrong. Try again.");
    }
    setPending(false);
  }

  if (!tokenFromUrl) {
    return (
      <div className="space-y-5">
        <p className={ui.errorText}>Open the reset link from your email to carry on.</p>
        <Link href="/forgot-password" className={`${ui.buttonPrimary} inline-flex w-full justify-center`}>
          Request a new link
        </Link>
        <p className="text-center text-sm text-stone-600">
          <Link href="/login" className="font-medium text-amber-900 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-stone-700">Password updated. Sign in with your new one.</p>
        <Link href="/login" className={`${ui.buttonPrimary} inline-flex w-full justify-center`}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <div>
        <label className={ui.label} htmlFor="reset-password">
          New password
        </label>
        <input
          id="reset-password"
          className={`${ui.input} mt-1`}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          disabled={pending}
        />
      </div>
      <div>
        <label className={ui.label} htmlFor="reset-password2">
          Confirm password
        </label>
        <input
          id="reset-password2"
          className={`${ui.input} mt-1`}
          type="password"
          autoComplete="new-password"
          placeholder="Repeat password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
          minLength={8}
          disabled={pending}
        />
      </div>
      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Saving…" : "Update password"}
      </button>
      <p className="text-center text-sm text-stone-600">
        <Link href="/login" className="font-medium text-amber-900 hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
