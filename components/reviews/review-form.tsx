"use client";

import { useState } from "react";
import Link from "next/link";

export function ReviewForm(props: {
  bookingId: string;
  experienceTitle: string;
  studioName: string;
  slotDate: string;
}) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: props.bookingId,
          rating,
          title,
          body,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Could not submit your review.");
        return;
      }
      setDone(true);
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-6 text-emerald-900">
        <h1 className="text-xl font-semibold">Thanks for your feedback</h1>
        <p className="mt-2 text-sm">Your review has been submitted and helps other students pick the right class.</p>
        <div className="mt-4">
          <Link href="/my-bookings" className="rounded-full bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800">
            Back to my bookings
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
      <h1 className="text-xl font-semibold text-amber-950">Review your class</h1>
      <p className="mt-1 text-sm text-stone-600">
        {props.experienceTitle} at {props.studioName} · {props.slotDate}
      </p>
      <form className="mt-5 space-y-4" onSubmit={onSubmit}>
        <div>
          <p className="text-sm font-medium text-stone-800">Your rating</p>
          <div className="mt-2 flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`text-2xl ${value <= rating ? "text-amber-500" : "text-stone-300"} transition`}
                aria-label={`Rate ${value} star${value === 1 ? "" : "s"}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">Title (optional)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 focus:ring"
            placeholder="Great beginner class"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-stone-800">Comments (optional)</span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={3000}
            rows={5}
            className="mt-1 w-full rounded-xl border border-stone-300 px-3 py-2 text-sm text-stone-900 outline-none ring-amber-200 focus:ring"
            placeholder="Tell future students what they should know."
          />
        </label>

        {error ? <p className="text-sm text-red-700">{error}</p> : null}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Submitting..." : "Submit review"}
          </button>
          <Link href="/my-bookings" className="text-sm font-medium text-stone-600 underline underline-offset-2 hover:text-stone-800">
            Cancel
          </Link>
        </div>
      </form>
    </section>
  );
}
