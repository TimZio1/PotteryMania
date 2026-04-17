"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  monthlyLabel,
  setupPathToPlanKey,
  studioPlanByKey,
  type StudioPlanPricingConfig,
} from "@/lib/studio-plan-pricing";
import { StudioBrandImageField } from "@/components/dashboard/studio-brand-image-field";
import { studioCoverRequirementsText, studioLogoRequirementsText } from "@/lib/studio-brand-media";
import { missingStudioFullFields, validateStudioQuickFields } from "@/lib/studio-registration-validation";

type SetupPath = "bookings" | "shop" | "both";

function normalizeSetupPath(value: string | null): SetupPath {
  if (value === "bookings" || value === "shop" || value === "both") return value;
  return "both";
}

function setupCopy(path: SetupPath) {
  if (path === "bookings") {
    return {
      title: "Step 2 · Quick setup",
      helper: "Two fields to start — then you’ll add your first experience and preview your page.",
      cta: "Create studio & continue",
    };
  }
  if (path === "shop") {
    return {
      title: "Step 2 · Quick setup",
      helper: "Two fields to start — then you’ll add your first product and preview your page.",
      cta: "Create studio & continue",
    };
  }
  return {
    title: "Step 2 · Quick setup",
    helper: "Two fields to start — then add your first experience or product and preview your public page.",
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [planPricing, setPlanPricing] = useState<Partial<StudioPlanPricingConfig> | null>(null);

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

  useEffect(() => {
    setFieldErrors({});
    setErr("");
  }, [fullForm]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/public/studio-plan-pricing", { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { planPricing?: Partial<StudioPlanPricingConfig> };
        if (j.planPricing) setPlanPricing(j.planPricing);
      } catch {
        // Leave defaults in place when pricing endpoint is unavailable.
      }
    })();
  }, []);

  const pathCopy = setupCopy(setup);
  const selectedPlan = studioPlanByKey(setupPathToPlanKey(setup), planPricing ?? undefined);

  function pushAfterCreate(studioId: string, profileIncomplete: boolean) {
    const q = profileIncomplete ? "welcome=1&profile=incomplete" : "welcome=1";
    /** Simple guided flows (one action per screen) — replaces dense dashboard as first stop. */
    router.push(`/dashboard/${studioId}/guided?${q}`);
  }

  function applyMissingFromResponse(missing: unknown) {
    if (!Array.isArray(missing)) return;
    const next: Record<string, string> = {};
    for (const m of missing) {
      if (typeof m === "string" && m) next[m] = "Required";
    }
    setFieldErrors(next);
  }

  async function submitQuick(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setFieldErrors({});
    const qd = {
      displayName: quick.displayName.trim(),
      country: quick.country.trim(),
      email: quick.email.trim(),
    };
    const qv = validateStudioQuickFields(qd);
    if (!qv.ok) {
      const next: Record<string, string> = {};
      if (!qd.displayName) next.displayName = "Required";
      if (!qd.country) next.country = "Required";
      if (!qd.email) next.email = "Required";
      setFieldErrors(next);
      setErr(qv.message);
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: qd.displayName,
          country: qd.country,
          city: quick.city.trim(),
          email: qd.email,
          quickStart: true,
          setupPath: setup,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(typeof j.error === "string" ? j.error : "Failed");
        applyMissingFromResponse(j.missing);
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
    setFieldErrors({});
    const trimmed: Record<string, string> = {};
    for (const key of Object.keys(f) as (keyof typeof f)[]) {
      trimmed[key] = typeof f[key] === "string" ? (f[key] as string).trim() : String(f[key] ?? "");
    }
    const missing = missingStudioFullFields(trimmed);
    if (missing.length) {
      const next: Record<string, string> = {};
      for (const m of missing) next[m] = "Required";
      setFieldErrors(next);
      setErr("Please fill in every field marked with *.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/studios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...trimmed, listingOnly: false, setupPath: setup }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(typeof j.error === "string" ? j.error : "Failed");
        applyMissingFromResponse(j.missing);
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

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  const inputInvalidClass = "border-rose-500 ring-1 ring-rose-200";
  const inputBaseClass =
    "mt-1 w-full rounded-xl border bg-white px-3 py-2 text-stone-900 shadow-sm placeholder:text-stone-400";

  const field = (k: keyof typeof f, label: string, required = false, type = "text") => {
    const fe = fieldErrors[k];
    return (
      <label key={k} className="block text-sm">
        <span className="text-[var(--muted)]">{required ? `${label} *` : label}</span>
        <input
          type={type}
          aria-invalid={fe ? "true" : undefined}
          className={`${inputBaseClass} ${fe ? inputInvalidClass : "border-stone-200"}`}
          value={f[k]}
          onChange={(e) => {
            setF({ ...f, [k]: e.target.value });
            clearFieldError(k);
          }}
          required={required}
          disabled={submitting}
        />
        {fe ? <p className="mt-1 text-xs text-rose-600">{fe}</p> : null}
      </label>
    );
  };

  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-6 sm:py-12">
      <Link href="/dashboard" className="inline-flex min-h-11 items-center text-sm font-medium text-amber-900 hover:text-[var(--foreground)]">
        ← Back
      </Link>
      <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
        Step 1 · What do you want to do?
      </p>
      <h1 className="mt-2 font-serif text-3xl font-normal tracking-[-0.02em] text-(--brand-ink)">Start selling your work</h1>
      <p className="mt-1 text-xs text-[var(--muted)]">Whether you&apos;re a solo potter or running a full studio, pick what fits you best right now. You can always add more later.</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{pathCopy.helper}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-3">
        <Link
          href={`/dashboard/studio/new?setup=bookings${fullForm ? "&full=1" : ""}`}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
            setup === "bookings"
              ? "border-amber-700/50 bg-amber-50 text-amber-950 shadow-sm"
              : "border-stone-200 bg-white text-stone-700 shadow-sm hover:border-amber-200/80"
          }`}
        >
          Programs &amp; sessions
        </Link>
        <Link
          href={`/dashboard/studio/new?setup=shop${fullForm ? "&full=1" : ""}`}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
            setup === "shop"
              ? "border-amber-700/50 bg-amber-50 text-amber-950 shadow-sm"
              : "border-stone-200 bg-white text-stone-700 shadow-sm hover:border-amber-200/80"
          }`}
        >
          Shop products
        </Link>
        <Link
          href={`/dashboard/studio/new?setup=both${fullForm ? "&full=1" : ""}`}
          className={`inline-flex min-h-11 items-center justify-center rounded-xl border px-3 py-2.5 text-center text-sm font-medium transition ${
            setup === "both"
              ? "border-amber-700/50 bg-amber-50 text-amber-950 shadow-sm"
              : "border-stone-200 bg-white text-stone-700 shadow-sm hover:border-amber-200/80"
          }`}
        >
          Both
        </Link>
      </div>
      <p className="mt-3 text-sm font-medium text-amber-900">{pathCopy.title}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Workspace plan: <span className="font-medium text-[var(--foreground)]">{selectedPlan.name}</span> ({monthlyLabel(selectedPlan)},
        plus platform commission based on your tier).
      </p>

      {!fullForm ? (
        <>
          <p className="mt-4 rounded-lg border border-amber-100 bg-amber-50/80 px-3 py-2 text-xs text-amber-950">
            Tax ID, full address, and branding can wait — add them anytime in{" "}
            <strong>Studio details</strong> before you turn on payouts.
          </p>
          <form onSubmit={submitQuick} className="mt-6 space-y-4">
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            {sessionStatus === "loading" ? (
              <p className="text-sm text-[var(--muted)]">Loading your account…</p>
            ) : null}
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Your name or studio name *</span>
              <input
                aria-invalid={fieldErrors.displayName ? "true" : undefined}
                className={`${inputBaseClass} ${fieldErrors.displayName ? inputInvalidClass : "border-stone-200"}`}
                value={quick.displayName}
                onChange={(e) => {
                  setQuick({ ...quick, displayName: e.target.value });
                  clearFieldError("displayName");
                }}
                placeholder="e.g. Maria Ceramics or River Clay Studio"
                required
                autoComplete="organization"
                disabled={submitting}
              />
              {fieldErrors.displayName ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.displayName}</p>
              ) : (
                <span className="mt-1 block text-xs text-[var(--muted)]">This is what customers see. Use your artist name or studio name.</span>
              )}
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Country *</span>
              <input
                aria-invalid={fieldErrors.country ? "true" : undefined}
                className={`${inputBaseClass} ${fieldErrors.country ? inputInvalidClass : "border-stone-200"}`}
                value={quick.country}
                onChange={(e) => {
                  setQuick({ ...quick, country: e.target.value });
                  clearFieldError("country");
                }}
                placeholder="e.g. Portugal"
                required
                autoComplete="country-name"
                disabled={submitting}
              />
              {fieldErrors.country ? <p className="mt-1 text-xs text-rose-600">{fieldErrors.country}</p> : null}
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">City or region (optional)</span>
              <input
                className={`${inputBaseClass} border-stone-200`}
                value={quick.city}
                onChange={(e) => setQuick({ ...quick, city: e.target.value })}
                placeholder="Add now or later"
                autoComplete="address-level2"
                disabled={submitting}
              />
            </label>
            <label className="block text-sm">
              <span className="text-[var(--muted)]">Contact email *</span>
              <input
                type="email"
                aria-invalid={fieldErrors.email ? "true" : undefined}
                className={`${inputBaseClass} ${fieldErrors.email ? inputInvalidClass : "border-stone-200"}`}
                value={quick.email}
                onChange={(e) => {
                  setQuick({ ...quick, email: e.target.value });
                  clearFieldError("email");
                }}
                required
                autoComplete="email"
                disabled={submitting}
              />
              {fieldErrors.email ? (
                <p className="mt-1 text-xs text-rose-600">{fieldErrors.email}</p>
              ) : (
                <span className="mt-1 block text-xs text-[var(--muted)]">We pre-fill from your account; change if needed.</span>
              )}
            </label>
            <button
              type="submit"
              disabled={submitting || sessionStatus === "loading"}
              className="w-full rounded-full bg-amber-950 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-amber-900 disabled:opacity-60"
            >
              {submitting ? "Creating…" : pathCopy.cta}
            </button>
          </form>
          <p className="mt-6 text-center text-sm text-[var(--muted)]">
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
          <p className="mt-4 text-xs text-[var(--muted)]">
            <Link href={`/dashboard/studio/new?setup=${setup}`} className="font-medium text-amber-900 underline">
              ← Back to quick setup
            </Link>
          </p>
          <form onSubmit={submitFull} className="mt-6 space-y-3">
            {err ? <p className="text-sm text-red-600">{err}</p> : null}
            <p className="text-xs text-[var(--muted)]">Fields marked with * are required before you can create the studio.</p>
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
            <StudioBrandImageField
              kind="logo"
              label="Logo"
              requirements={studioLogoRequirementsText()}
              value={f.logoUrl}
              onChange={(logoUrl) => setF((prev) => ({ ...prev, logoUrl }))}
            />
            <StudioBrandImageField
              kind="cover"
              label="Cover image"
              requirements={studioCoverRequirementsText()}
              value={f.coverImageUrl}
              onChange={(coverImageUrl) => setF((prev) => ({ ...prev, coverImageUrl }))}
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full bg-amber-950 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-amber-900 disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create studio"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
