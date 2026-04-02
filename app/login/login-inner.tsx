"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

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
      setErr("Invalid email or password");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-amber-900">Sign in</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        <input
          className="w-full rounded border border-stone-300 px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="w-full rounded border border-stone-300 px-3 py-2"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white hover:bg-amber-900">
          Sign in
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        No account? <Link href="/register" className="text-amber-800 underline">Register</Link>
      </p>
    </div>
  );
}