"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type LocationRow = {
  id: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  country: string;
  postalCode: string | null;
  isDefault: boolean;
  isActive: boolean;
};

export function StudioLocationsClient({
  studioId,
  initialItems,
}: {
  studioId: string;
  initialItems: LocationRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");

  async function refresh() {
    const res = await fetch(`/api/studios/${studioId}/locations`);
    const data = (await res.json()) as { items?: LocationRow[] };
    if (res.ok && data.items) setItems(data.items);
  }

  async function createLocation(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, addressLine1, city, country }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create location");
      setName("");
      setAddressLine1("");
      setCity("");
      setCountry("");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not create location");
    } finally {
      setBusy(false);
    }
  }

  async function removeLocation(id: string) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/locations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not delete location");
      }
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not delete location");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <form onSubmit={createLocation} className="grid gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-2">
        <label className="block">
          <span className={ui.label}>Location name</span>
          <input className={`${ui.input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block">
          <span className={ui.label}>Address</span>
          <input className={`${ui.input} mt-1`} value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} required />
        </label>
        <label className="block">
          <span className={ui.label}>City</span>
          <input className={`${ui.input} mt-1`} value={city} onChange={(e) => setCity(e.target.value)} required />
        </label>
        <label className="block">
          <span className={ui.label}>Country</span>
          <input className={`${ui.input} mt-1`} value={country} onChange={(e) => setCountry(e.target.value)} required />
        </label>
        <div className="sm:col-span-2">
          <button type="submit" disabled={busy} className={ui.buttonPrimary}>
            {busy ? "Saving..." : "Add location"}
          </button>
        </div>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No locations yet.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((loc) => (
            <li key={loc.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-[var(--foreground)]">{loc.name}</p>
                <button type="button" className="text-xs font-medium text-red-400 hover:underline" onClick={() => void removeLocation(loc.id)}>
                  Delete
                </button>
              </div>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {loc.addressLine1}
                {loc.addressLine2 ? `, ${loc.addressLine2}` : ""}, {loc.city}, {loc.country}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
