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

  const inputClass =
    "mt-1.5 w-full rounded-2xl border border-(--ink)/10 bg-white px-4 py-3 text-sm text-(--ink) outline-none transition placeholder:text-(--shadow)/50 focus:border-(--heat) focus:ring-2 focus:ring-(--heat)/20";

  const labelClass = "pm-caption text-(--shadow)";

  return (
    <div className="pm-brand rounded-2xl border border-(--clay)/20 bg-(--clay) p-6 text-(--ink) shadow-[0_24px_80px_-20px_rgba(0,0,0,0.55)] sm:p-8">
      <div>
        <p className="pm-caption text-(--heat)">Apply</p>
        <h2 className="pm-display mt-3 text-[1.75rem] text-(--ink) sm:text-[2.125rem]">Become an affiliate</h2>
        <p className="mt-3 text-sm leading-7 text-(--shadow) sm:text-base">
          Tell us who you are and where you will share. Approved partners get a tracked link and 15% commission.
        </p>
      </div>
      {message ? (
        <div className="mt-5 rounded-2xl border border-(--heat)/35 bg-(--heat)/8 px-4 py-3 text-sm font-medium text-(--ink)">
          {message}
        </div>
      ) : null}
      <div className="mt-6 grid gap-4">
        <label>
          <span className={labelClass}>Name</span>
          <input
            className={inputClass}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="Your name"
          />
        </label>
        <label>
          <span className={labelClass}>Email</span>
          <input
            className={inputClass}
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
            type="email"
          />
        </label>
        <label>
          <span className={labelClass}>Audience</span>
          <input
            className={inputClass}
            value={form.audience}
            onChange={(e) => setForm((f) => ({ ...f, audience: e.target.value }))}
            placeholder="Example: pottery students, makers, Instagram followers"
          />
        </label>
        <label>
          <span className={labelClass}>Where will you share?</span>
          <input
            className={inputClass}
            value={form.channels}
            onChange={(e) => setForm((f) => ({ ...f, channels: e.target.value }))}
            placeholder="Instagram, TikTok, YouTube, newsletter, studio…"
          />
        </label>
        <label>
          <span className={labelClass}>Anything else?</span>
          <textarea
            className={`${inputClass} min-h-32 resize-y`}
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Tell us why PotteryMania fits your audience."
          />
        </label>
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="pm-btn pm-btn--heat inline-flex min-h-12 w-full items-center justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          Send application
        </button>
      </div>
    </div>
  );
}
