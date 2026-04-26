"use client";

import { useState } from "react";

export function AffiliateApplicationForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    audience: "",
    channels: "",
    message: "",
  });

  async function submit() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/wear/affiliate-applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof json.error === "string" ? json.error : "Could not send application.");
        return;
      }
      setForm({ name: "", email: "", audience: "", channels: "", message: "" });
      setMessage("Application sent. We will review it and reply from affiliates@potterymania.com.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Apply</p>
        <h2 className="mt-2 font-serif text-3xl text-amber-950">Become an affiliate</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Tell us who you are and where you will share. Approved partners get a tracked link and 10% commission.
        </p>
      </div>
      {message ? (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {message}
        </div>
      ) : null}
      <div className="mt-6 grid gap-4">
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Name</span>
          <input
            className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Your name"
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Email</span>
          <input
            className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            type="email"
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Audience</span>
          <input
            className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500"
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            placeholder="Example: pottery students, makers, Instagram followers"
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Where will you share?</span>
          <input
            className="mt-1.5 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500"
            value={form.channels}
            onChange={(e) => setForm((f) => ({ ...f, channels: e.target.value }))}
            placeholder="Instagram, TikTok, YouTube, newsletter, studio..."
          />
        </label>
        <label>
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">Anything else?</span>
          <textarea
            className="mt-1.5 min-h-32 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-amber-500"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Tell us why PotteryMania fits your audience."
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-amber-950 px-6 text-sm font-semibold text-white transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Send application
        </button>
      </div>
    </div>
  );
}
