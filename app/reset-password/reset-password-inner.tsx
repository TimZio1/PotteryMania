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
      setErr("Password must be at least 8 characters.");
      return;
    }
    if (password !== password2) {
      setErr("Passwords do not match.");
      return;
    }
    if (!tokenFromUrl) {
      setErr("Missing reset link. Open the link from your email or request a new reset.");
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
        setErr("Too many attempts. Please wait and try again.");
        setPending(false);
        return;
      }
      if (!r.ok) {
        setErr(data.error || "Could not reset password. The link may have expired.");
        setPending(false);
        return;
      }
      setDone(true);
    } catch {
      setErr("Something went wrong. Please try again.");
    }
    setPending(false);
  }

  if (!tokenFromUrl) {
    return (
      <div className="space-y-5">
        <p className={ui.errorText}>This page needs a valid reset link from your email.</p>
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
        <p className="text-sm text-stone-700">Your password has been updated. You can sign in with your new password.</p>
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
