"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewStudioPage() {
  const router = useRouter();
  const [err, setErr] = useState("");
  const [f, setF] = useState({
    displayName: "",
    legalBusinessName: "",
    vatNumber: "",
    responsiblePersonName: "",
    email: "",
    phone: "",
    country: "",
    city: "",
    addressLine1: "",
    addressLine2: "",
    postalCode: "",
    shortDescription: "",
    longDescription: "",
    logoUrl: "",
    coverImageUrl: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/studios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Failed");
      return;
    }
    router.push(`/dashboard/studio/${j.studio.id}`);
  }

  const field = (k: keyof typeof f, label: string, required = false) => (
    <label key={k} className="block text-sm">
      <span className="text-stone-600">{label}</span>
      <input
        className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
        required={required}
      />
    </label>
  );

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Create studio</h1>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {err && <p className="text-sm text-red-600">{err}</p>}
        {field("displayName", "Display name", true)}
        {field("legalBusinessName", "Legal business name", true)}
        {field("vatNumber", "VAT / tax number", true)}
        {field("responsiblePersonName", "Responsible person", true)}
        {field("email", "Studio email", true)}
        {field("phone", "Phone")}
        {field("country", "Country", true)}
        {field("city", "City", true)}
        {field("addressLine1", "Address line 1", true)}
        {field("addressLine2", "Address line 2")}
        {field("postalCode", "Postal code")}
        {field("shortDescription", "Short description")}
        {field("longDescription", "Long description")}
        {field("logoUrl", "Logo image URL")}
        {field("coverImageUrl", "Cover image URL")}
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white">
          Save draft
        </button>
      </form>
    </div>
  );
}