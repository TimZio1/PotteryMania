"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditStudioPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const router = useRouter();
  const [err, setErr] = useState("");
  const [studio, setStudio] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/studios");
      const j = await r.json();
      const s = j.studios?.find((x: { id: string }) => x.id === studioId);
      if (s) {
        const copy: Record<string, string> = {};
        for (const [k, v] of Object.entries(s)) {
          copy[k] = v == null ? "" : String(v);
        }
        setStudio(copy);
      }
    })();
  }, [studioId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch(`/api/studios/${studioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studio),
    });
    if (!r.ok) {
      const j = await r.json();
      setErr(j.error || "Failed");
      return;
    }
    router.refresh();
  }

  async function submitReview() {
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/submit`, { method: "POST" });
    if (!r.ok) {
      const j = await r.json();
      setErr(j.error || "Failed");
      return;
    }
    router.push("/dashboard");
  }

  async function stripeOnboard() {
    const r = await fetch(`/api/studios/${studioId}/stripe/onboard`, { method: "POST" });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else setErr(j.error || "Stripe error");
  }

  async function stripeSync() {
    await fetch(`/api/studios/${studioId}/stripe/sync`);
    router.refresh();
  }

  if (!studio) return <div className="p-8">Loading…</div>;

  const keys = [
    "displayName",
    "legalBusinessName",
    "vatNumber",
    "responsiblePersonName",
    "email",
    "phone",
    "country",
    "city",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "shortDescription",
    "longDescription",
    "logoUrl",
    "coverImageUrl",
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Studio</h1>
      <p className="text-sm text-stone-500">Status: {studio.status}</p>
      {studio.rejectionReason && (
        <p className="mt-2 text-sm text-red-600">Reason: {studio.rejectionReason}</p>
      )}
      <form onSubmit={save} className="mt-6 space-y-3">
        {err && <p className="text-sm text-red-600">{err}</p>}
        {keys.map((k) => (
          <label key={k} className="block text-sm">
            <span className="text-stone-600">{k}</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={studio[k] || ""}
              onChange={(e) => setStudio({ ...studio, [k]: e.target.value })}
            />
          </label>
        ))}
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white">
          Save
        </button>
      </form>
      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={`/dashboard/experiences/${studioId}`}
          className="rounded border border-stone-300 py-2 text-center text-amber-900"
        >
          Classes &amp; experiences
        </Link>
        <Link
          href={`/dashboard/bookings/${studioId}`}
          className="rounded border border-stone-300 py-2 text-center text-amber-900"
        >
          Bookings
        </Link>
        <button type="button" onClick={submitReview} className="rounded border border-amber-800 py-2 text-amber-900">
          Submit for review
        </button>
        <button type="button" onClick={stripeOnboard} className="rounded bg-stone-800 py-2 text-white">
          Connect Stripe
        </button>
        <button type="button" onClick={stripeSync} className="text-sm text-stone-600 underline">
          Refresh Stripe status
        </button>
      </div>
    </div>
  );
}