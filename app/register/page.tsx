"use client";

import Link from "next/link";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"customer" | "vendor">("customer");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setOk("");
    const r = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Registration failed");
      return;
    }
    setOk("Account created. You can sign in.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold text-amber-900">Create account</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {err && <p className="text-sm text-red-600">{err}</p>}
        {ok && <p className="text-sm text-green-700">{ok}</p>}
        <label className="block text-sm text-stone-600">I am a</label>
        <select
          className="w-full rounded border border-stone-300 px-3 py-2"
          value={role}
          onChange={(e) => setRole(e.target.value as "customer" | "vendor")}
        >
          <option value="customer">Customer</option>
          <option value="vendor">Studio / vendor</option>
        </select>
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
          placeholder="Password (min 8)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white hover:bg-amber-900">
          Register
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-600">
        <Link href="/login" className="text-amber-800 underline">Sign in</Link>
      </p>
    </div>
  );
}