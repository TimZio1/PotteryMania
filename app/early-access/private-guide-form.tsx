"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type OfferingIntent = "shop" | "classes" | "both";

export function PrivateGuideForm() {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    email: "",
    studioName: "",
    country: "",
    googleMapsUrl: "",
    websiteOrIg: "",
    offeringIntent: "both" as OfferingIntent,
    website: "",
  });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not save your details. Try again.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className={`${ui.card} text-center`}>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">You are on the list.</h2>
        <p className="mt-3 text-sm text-(--muted)">
          Thanks. We saved your studio details and will contact you for the next step.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? (
        <p className={ui.errorText} role="alert">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={ui.label}>Email *</span>
          <input
            className={`${ui.input} mt-2`}
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="you@studio.com"
          />
        </label>
        <label className="block">
          <span className={ui.label}>Studio name *</span>
          <input
            className={`${ui.input} mt-2`}
            type="text"
            autoComplete="organization"
            required
            disabled={pending}
            value={form.studioName}
            onChange={(e) => setForm((prev) => ({ ...prev, studioName: e.target.value }))}
            placeholder="Your studio name"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={ui.label}>Country *</span>
          <input
            className={`${ui.input} mt-2`}
            type="text"
            autoComplete="country-name"
            required
            disabled={pending}
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            placeholder="Country"
          />
        </label>
        <label className="block">
          <span className={ui.label}>Google Maps link (recommended)</span>
          <input
            className={`${ui.input} mt-2`}
            type="url"
            inputMode="url"
            disabled={pending}
            value={form.googleMapsUrl}
            onChange={(e) => setForm((prev) => ({ ...prev, googleMapsUrl: e.target.value }))}
            placeholder="https://maps.google.com/..."
          />
        </label>
      </div>

      <div>
        <label className="block">
          <span className={ui.label}>Website or Instagram (optional)</span>
          <input
            className={`${ui.input} mt-2`}
            type="text"
            disabled={pending}
            value={form.websiteOrIg}
            onChange={(e) => setForm((prev) => ({ ...prev, websiteOrIg: e.target.value }))}
            placeholder="instagram.com/yourstudio"
          />
        </label>
      </div>

      <label className="block">
        <span className={ui.label}>What do you want to start with? *</span>
        <select
          className={`${ui.select} mt-2`}
          required
          disabled={pending}
          value={form.offeringIntent}
          onChange={(e) => setForm((prev) => ({ ...prev, offeringIntent: e.target.value as OfferingIntent }))}
        >
          <option value="both">Both: sell products and run classes</option>
          <option value="shop">Sell products</option>
          <option value="classes">Run classes</option>
        </select>
      </label>

      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
        value={form.website}
        onChange={(e) => setForm((prev) => ({ ...prev, website: e.target.value }))}
      />

      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Saving..." : "Register studio"}
      </button>
    </form>
  );
}
