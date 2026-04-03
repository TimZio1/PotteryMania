"use client";

import Link from "next/link";
import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export function RegisterForm() {
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
    <form onSubmit={onSubmit} className="space-y-5">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      {ok ? <p className={ui.successText}>{ok}</p> : null}
      <div>
        <span className={ui.label}>Account type</span>
        <p className="mt-1 text-xs text-stone-500">Vendors manage a studio; customers shop and book classes.</p>
        <select
          className={`${ui.input} mt-2`}
          value={role}
          onChange={(e) => setRole(e.target.value as "customer" | "vendor")}
          aria-label="Account type"
        >
          <option value="customer">Customer — shop &amp; book</option>
          <option value="vendor">Studio / vendor — sell &amp; schedule</option>
        </select>
      </div>
      <div>
        <label className={ui.label} htmlFor="reg-email">
          Email
        </label>
        <input
          id="reg-email"
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
        <label className={ui.label} htmlFor="reg-password">
          Password
        </label>
        <input
          id="reg-password"
          className={`${ui.input} mt-1`}
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </div>
      <button type="submit" className={`${ui.buttonPrimary} w-full`}>
        Create account
      </button>
      <p className="text-center text-sm text-stone-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-amber-900 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
