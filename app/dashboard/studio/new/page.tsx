"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { monthlyLabel, setupPathToPlanKey, studioPlanByKey } from "@/lib/studio-plan-pricing";

type SetupPath = "bookings" | "shop" | "both";

function normalizeSetupPath(value: string | null): SetupPath {
  if (value === "bookings" || value === "shop" || value === "both") return value;
  return "both";
}

function setupCopy(path: SetupPath) {
  if (path === "bookings") {
    return {
      title: "Step 2 · Bookings first",
      helper: "You’ll land in bookings after this — add one class with a slot, then share your public link.",
      cta: "Create your studio",
    };
  }
  if (path === "shop") {
    return {
      title: "Step 2 · Shop first",
      helper: "You’ll land in the shop after this — publish one product, then share your public link.",
      cta: "Start your shop",
    };
  }
  return {
    title: "Step 2 · Shop + bookings",
    helper: "Full studio setup: sell work and book classes from one dashboard. Under 10 minutes to a shareable page.",
    cta: "Create your studio",
  };
}

export default function NewStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setup = normalizeSetupPath(searchParams.get("setup"));
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
  const pathCopy = setupCopy(setup);
  const selectedPlan = studioPlanByKey(setupPathToPlanKey(setup));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch("/api/studios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, listingOnly: false, setupPath: setup }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Failed");
      return;
    }
    const studioId = j?.studio?.id as string;
    if (!studioId) {
      setErr("Studio was created but no dashboard destination was returned.");
      return;
    }
    if (setup === "bookings") {
      router.push(`/dashboard/${studioId}/bookings?onboarding=1`);
      return;
    }
    if (setup === "shop") {
      router.push(`/dashboard/${studioId}/shop?onboarding=1`);
      return;
    }
    router.push(`/dashboard/${studioId}?onboarding=1`);
  }

  const field = (k: keyof typeof f, label: string, required = false, type = "text") => (
    <label key={k} className="block text-sm">
      <span className="text-stone-600">{label}</span>
      <input
        type={type}
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
      <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-stone-500">Step 1 · What do you sell first?</p>
      <h1 className="mt-2 text-2xl font-semibold">Set up your studio</h1>
      <p className="mt-2 text-sm text-stone-600">{pathCopy.helper}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Link
          href="/dashboard/studio/new?setup=bookings"
          className={`rounded-lg border px-3 py-2 text-sm ${
            setup === "bookings" ? "border-amber-800 bg-amber-50 text-amber-950" : "border-stone-300 text-stone-700"
          }`}
        >
          Book classes
        </Link>
        <Link
          href="/dashboard/studio/new?setup=shop"
          className={`rounded-lg border px-3 py-2 text-sm ${
            setup === "shop" ? "border-amber-800 bg-amber-50 text-amber-950" : "border-stone-300 text-stone-700"
          }`}
        >
          Sell products
        </Link>
        <Link
          href="/dashboard/studio/new?setup=both"
          className={`rounded-lg border px-3 py-2 text-sm ${
            setup === "both" ? "border-amber-800 bg-amber-50 text-amber-950" : "border-stone-300 text-stone-700"
          }`}
        >
          Both
        </Link>
      </div>
      <p className="mt-3 text-sm font-medium text-amber-900">{pathCopy.title}</p>
      <p className="mt-2 text-xs text-stone-500">
        Step 3 after save: copy your public studio link and send your first product or class live.
      </p>
      <p className="mt-1 text-sm text-stone-600">
        Recommended plan: <span className="font-medium text-stone-800">{selectedPlan.name}</span> (
        {monthlyLabel(selectedPlan)}, 0% platform commission).
      </p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        {err && <p className="text-sm text-red-600">{err}</p>}
        {field("displayName", "Display name", true)}
        {field("legalBusinessName", "Legal business name", true)}
        {field("vatNumber", "VAT / tax number", true)}
        {field("responsiblePersonName", "Responsible person", true)}
        {field("email", "Studio email", true, "email")}
        {field("phone", "Phone")}
        {field("country", "Country", true)}
        {field("city", "City", true)}
        {field("addressLine1", "Address line 1", true)}
        {field("addressLine2", "Address line 2")}
        {field("postalCode", "Postal code")}
        {field("shortDescription", "Short description")}
        {field("longDescription", "Long description")}
        {field("logoUrl", "Logo image URL", false, "url")}
        {field("coverImageUrl", "Cover image URL", false, "url")}
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white">
          {pathCopy.cta}
        </button>
      </form>
    </div>
  );
}