"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Exp = {
  id: string;
  title: string;
  status: string;
  priceCents: number;
};

export default function StudioExperiencesPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const [list, setList] = useState<Exp[]>([]);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [priceEur, setPriceEur] = useState("35");

  async function load() {
    const r = await fetch(`/api/studios/${studioId}/experiences`);
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Failed");
      return;
    }
    setList(j.experiences || []);
  }

  useEffect(() => {
    load();
  }, [studioId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const priceCents = Math.round(parseFloat(priceEur) * 100);
    if (!title.trim() || !Number.isFinite(priceCents) || priceCents < 0) {
      setErr("Title and valid price required");
      return;
    }
    const r = await fetch(`/api/studios/${studioId}/experiences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        experienceType: "workshop",
        locationType: "studio_address",
        durationMinutes: 120,
        capacity: 8,
        minimumParticipants: 1,
        maximumParticipants: 8,
        priceCents,
        status: "draft",
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Create failed");
      return;
    }
    setTitle("");
    await load();
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href={`/dashboard/studio/${studioId}`} className="text-sm text-amber-800">
        ← Studio
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Experiences</h1>
      <p className="mt-2 text-sm text-stone-600">
        Create a class, add rules via API, generate slots, then set status to <strong>active</strong> and visibility{" "}
        <strong>public</strong> so it appears on /classes.
      </p>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <form onSubmit={create} className="mt-6 space-y-3 rounded border border-stone-200 bg-white p-4">
        <h2 className="font-medium">New experience (draft)</h2>
        <label className="block text-sm">
          Title
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Price (EUR / person)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={priceEur}
            onChange={(e) => setPriceEur(e.target.value)}
          />
        </label>
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white">
          Create
        </button>
      </form>
      <ul className="mt-8 space-y-2 text-sm">
        {list.map((ex) => (
          <li key={ex.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 py-2">
            <span>
              {ex.title}{" "}
              <span className="text-stone-500">
                ({ex.status}) €{(ex.priceCents / 100).toFixed(2)}
              </span>
            </span>
            <Link href={`/classes/${ex.id}`} className="text-amber-800 underline">
              Preview
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}