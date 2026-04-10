"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { monthlyLabel, setupPathToPlanKey, studioPlanByKey } from "@/lib/studio-plan-pricing";

type SetupPath = "bookings" | "shop" | "both";

function normalizeSetupPath(value: string | null): SetupPath {
  if (value === "bookings" || value === "shop" || value === "both") return value;
  return "both";
}

function setupCopy(path: SetupPath) {
  if (path === "bookings") {
    return {
      title: "Step 2 · Quick setup",
      helper: "Two fields to start — then you’ll add your first class and share your link.",
      cta: "Create studio & continue",
    };
  }
  if (path === "shop") {
    return {
      title: "Step 2 · Quick setup",
      helper: "Two fields to start — then you’ll add your first product and share your link.",
      cta: "Create studio & continue",
    };
  }
  return {
    title: "Step 2 · Quick setup",
    helper: "Two fields to start — then add a product or class and share your public page.",
    cta: "Create studio & continue",
  };
}

export default function NewStudioPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const setup = normalizeSetupPath(searchParams.get("setup"));
  const fullForm = searchParams.get("full") === "1";

  const [err, setErr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [quick, setQuick] = useState({
    displayName: "",
    country: "",
    city: "",
    email: "",
  });

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

  useEffect(() => {
    const acct = session?.user?.email;
    if (acct && !quick.email) {
      setQuick((q) => ({ ...q, email: acct }));
    }
    if (acct && !f.email) {
      setF((prev) => ({ ...prev, email: acct }));
    }
  }, [session?.user?.email, quick.email, f.email]);

  const pathCopy = setupCopy(setup);
  const selectedPlan = studioPlanByKey(setupPathToPlanKey(setup));

  function pushAfterCreate(studioId: string, profileIncomplete: boolean) {
    const q = profileIncomplete ? "onboarding=1&profile=incomplete" : "onboarding=1";
    if (setup === "bookings") {
      router.push(`/dashboard/${studioId}/bookings?${q}`);
      return;
    }
    if (setup === "shop") {
      router.push(`/dashboard/${studioId}/shop?${q}`);
      return;
    }
    router.push(`/dashboard/${studioId}?${q}`);
  }

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: quick.displayName.trim(),
          country: quick.country.trim(),
          city: quick.city.trim(),
          email: quick.email.trim(),
          quickStart: true,
          setupPath: setup,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(typeof j.error === "string" ? j.error : "Failed");
        return;
      }
      const studioId = j?.studio?.id as string;
      if (!studioId) {
        setErr("Studio was created but no dashboard destination was returned.");
        return;
      }
      pushAfterCreate(studioId, true);
    } finally {
      setSubmitting(false);
    }
  }

  async function submitFull(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setSubmitting(true);
    try {
      const r = await fetch("/api/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, listingOnly: false, setupPath: setup }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(typeof j.error === "string" ? j.error : "Failed");
        return;
      }
      const studioId = j?.studio?.id as string;
      if (!studioId) {
        setErr("Studio was created but no dashboard destination was returned.");
        return;
      }
      pushAfterCreate(studioId, false);
    } finally {
      setSubmitting(false);
    }
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
        disabled={submitting}
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
          href={`/dashboard/studio/new?setup=bookings${fullForm ? "&full=1" : ""}`}
          className={`rounded-lg border px-3 py-2 text-sm ${
            setup === "bookings" ? "border-amber-800 bg-amber-50 text-amber-950" : "border-stone-300 text-stone-700"
          }`}
        >
          Book classes
        </Link>
        <Link
          href={`/dashboard/studio/new?setup=shop${fullForm ? "&full=1" : ""}`}
          className={`rounded-lg border px-3 py-2 text-sm ${
            setup === "shop" ? "border-amber-800 bg-amber-50 text-amber-950" : "border-stone-300 text-stone-700"
          }`}
        >
          Sell products
        </Link>
        <Link
          href={`/dashboard/studio/new?setup=both${fullForm ? "&full=1" : ""}`}
          className={`rounded-lg border px-3 py-2 text-sm ${
            setup === "both" ? "border-amber-800 bg-amber-50 text-amber-950" : "border-stone-300 text-stone-700"
          }`}
        >
          Both
        </Link>
      </div>
      <p className="mt-3 text-sm font-medium text-amber-900">{pathCopy.title}</p>
      <p className="mt-1 text-sm text-stone-600">
        Plan: <span className="font-medium text-stone-800">{selectedPlan.name}</span> ({monthlyLabel(selectedPlan)}, 0%
        platform commission).
      </p>

      {!fullForm ? (
        <>
          <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
            Tax ID, full address, and branding can wait — add them anytime in{" "}
            <strong>Studio profile</strong> before you turn on payouts.
          </p>
          <form onSubmit={submitQuick} className="mt-6 space-y-4">
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            {sessionStatus === "loading" ? (
              <p className="text-sm text-stone-500">Loading your account…</p>
            ) : null}
            <label className="block text-sm">
              <span className="text-stone-600">Studio name</span>
              <input
                className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
                value={quick.displayName}
                onChange={(e) => setQuick({ ...quick, displayName: e.target.value })}
                placeholder="e.g. River Clay Studio"
                required
                autoComplete="organization"
                disabled={submitting}
              />
              <span className="mt-1 block text-xs text-stone-500">Shown on your public page.</span>
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Country</span>
              <input
                className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
                value={quick.country}
                onChange={(e) => setQuick({ ...quick, country: e.target.value })}
                placeholder="e.g. Portugal"
                required
                autoComplete="country-name"
                disabled={submitting}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">City or region (optional)</span>
              <input
                className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
                value={quick.city}
                onChange={(e) => setQuick({ ...quick, city: e.target.value })}
                placeholder="Add now or later"
                autoComplete="address-level2"
                disabled={submitting}
              />
            </label>
            <label className="block text-sm">
              <span className="text-stone-600">Contact email</span>
              <input
                type="email"
                className="mt-1 w-full rounded border border-stone-300 px-3 py-2"
                value={quick.email}
                onChange={(e) => setQuick({ ...quick, email: e.target.value })}
                required
                autoComplete="email"
                disabled={submitting}
              />
              <span className="mt-1 block text-xs text-stone-500">We pre-fill from your account; change if needed.</span>
            </label>
            <button
              type="submit"
              disabled={submitting || sessionStatus === "loading"}
              className="w-full rounded bg-amber-800 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Creating…" : pathCopy.cta}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-stone-600">
            Need VAT, legal entity name, and full address now?{" "}
            <Link
              href={`/dashboard/studio/new?setup=${setup}&full=1`}
              className="font-medium text-amber-900 underline underline-offset-2"
            >
              Use the full form
            </Link>
          </p>
        </>
      ) : (
        <>
          <p className="mt-4 text-xs text-stone-500">
            <Link href={`/dashboard/studio/new?setup=${setup}`} className="font-medium text-amber-900 underline">
              ← Back to quick setup
            </Link>
          </p>
          <form onSubmit={submitFull} className="mt-6 space-y-3">
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
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
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded bg-amber-800 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create studio"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
