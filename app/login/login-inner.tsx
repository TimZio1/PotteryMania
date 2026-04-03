"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export default function LoginInner() {
  const sp = useSearchParams();
  const callbackUrl = sp.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await signIn("credentials", { email, password, redirect: false });
    if (r?.error) {
      setErr("Invalid email or password.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <div>
        <label className={ui.label} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className={`${ui.input} mt-1`}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label className={ui.label} htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          className={`${ui.input} mt-1`}
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className={`${ui.buttonPrimary} w-full`}>
        Sign in
      </button>
      <p className="text-center text-sm text-stone-600">
        New here?{" "}
        <Link href="/register" className="font-medium text-amber-900 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
