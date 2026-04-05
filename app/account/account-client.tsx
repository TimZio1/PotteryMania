"use client";

import { useCallback, useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";

const LANG_OPTIONS = [
  { value: "", label: "Default" },
  { value: "en", label: "English" },
  { value: "el", label: "Greek (Ελληνικά)" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
];

const CURR_OPTIONS = [
  { value: "", label: "Default (EUR)" },
  { value: "EUR", label: "EUR" },
  { value: "GBP", label: "GBP" },
  { value: "USD", label: "USD" },
];

export function AccountClient() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState("");
  const [preferredCurrency, setPreferredCurrency] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    const res = await fetch("/api/me/customer-profile");
    if (!res.ok) {
      setErr("Could not load your profile.");
      setLoading(false);
      return;
    }
    const data = await res.json();
    setEmail(data.email ?? "");
    setFullName(data.profile?.fullName ?? "");
    setPhone(data.profile?.phone ?? "");
    setPreferredLanguage(data.profile?.preferredLanguage ?? "");
    setPreferredCurrency(data.profile?.preferredCurrency ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setErr("");
    const res = await fetch("/api/me/customer-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        phone,
        preferredLanguage,
        preferredCurrency,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(typeof data.error === "string" ? data.error : "Could not save.");
    } else {
      setMsg("Saved.");
      if (data.profile) {
        setFullName(data.profile.fullName ?? "");
        setPhone(data.profile.phone ?? "");
        setPreferredLanguage(data.profile.preferredLanguage ?? "");
        setPreferredCurrency(data.profile.preferredCurrency ?? "");
      }
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className={ui.overline}>Account</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950 sm:text-3xl">Your profile</h1>
      <p className="mt-2 text-sm text-stone-600">
        Name and phone can pre-fill bookings and checkout where we use them. Language and currency are preferences for
        future features.
      </p>

      {err ? <p className="mt-6 text-sm font-medium text-red-700">{err}</p> : null}
      {msg ? <p className="mt-6 text-sm font-medium text-emerald-800">{msg}</p> : null}

      <form onSubmit={onSubmit} className={`${ui.card} mt-8 space-y-5`}>
        <div>
          <label className={ui.label} htmlFor="acct-email">
            Email
          </label>
          <input id="acct-email" type="email" value={email} disabled className={`${ui.input} mt-1.5 bg-stone-50`} />
          <p className={`${ui.helper} mt-1`}>Sign in email — contact support to change.</p>
        </div>
        <div>
          <label className={ui.label} htmlFor="acct-name">
            Full name
          </label>
          <input
            id="acct-name"
            name="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={`${ui.input} mt-1.5`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="acct-phone">
            Phone
          </label>
          <input
            id="acct-phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={`${ui.input} mt-1.5`}
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="acct-lang">
            Preferred language
          </label>
          <select
            id="acct-lang"
            name="preferredLanguage"
            value={preferredLanguage}
            onChange={(e) => setPreferredLanguage(e.target.value)}
            className={`${ui.input} mt-1.5`}
          >
            {LANG_OPTIONS.map((o) => (
              <option key={o.value || "default"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={ui.label} htmlFor="acct-curr">
            Preferred currency
          </label>
          <select
            id="acct-curr"
            name="preferredCurrency"
            value={preferredCurrency}
            onChange={(e) => setPreferredCurrency(e.target.value)}
            className={`${ui.input} mt-1.5`}
          >
            {CURR_OPTIONS.map((o) => (
              <option key={o.value || "default"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" disabled={saving} className={ui.buttonPrimary}>
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
