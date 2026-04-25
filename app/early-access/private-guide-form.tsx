"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ui } from "@/lib/ui-styles";
import { uploadEarlyAccessImage } from "@/lib/early-access-client-upload";
import { optimizeImageForUpload } from "@/lib/optimize-image-client";
import { STUDIO_COVER_OPTIMIZE, STUDIO_LOGO_OPTIMIZE } from "@/lib/studio-brand-media";

type Step = 1 | 2 | 3 | 4 | 5 | 6;
type OfferingIntent = "classes" | "workshops" | "shop";
type BookingIntent = "classes" | "private" | "products" | "not_sure";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function PrivateGuideForm() {
  const [step, setStep] = useState<Step>(1);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [googlePending, setGooglePending] = useState(false);
  const [form, setForm] = useState({
    email: "",
    studioName: "",
    country: "",
    offerings: [] as OfferingIntent[],
    shortDescription: "",
    teamSize: "",
    /** New files picked on step 2; uploaded on save */
    logoFile: null as File | null,
    photoFiles: [] as File[],
    /** After a successful lead save, used so repeat saves (e.g. account step) do not re-upload */
    leadLogoUrl: "",
    leadPhotoUrls: [] as string[],
    bookingIntent: "not_sure" as BookingIntent,
  });

  function goTo(next: Step) {
    setError("");
    setStep(next);
  }

  function toggleOffering(offering: OfferingIntent) {
    setForm((prev) => {
      if (prev.offerings.includes(offering)) {
        return { ...prev, offerings: prev.offerings.filter((x) => x !== offering) };
      }
      return { ...prev, offerings: [...prev.offerings, offering] };
    });
  }

  function getEarlyAccessIntent(): "shop" | "classes" | "both" {
    const hasShop = form.offerings.includes("shop") || form.bookingIntent === "products";
    const hasClasses =
      form.offerings.includes("classes") ||
      form.offerings.includes("workshops") ||
      form.bookingIntent === "classes" ||
      form.bookingIntent === "private";
    if (hasShop && hasClasses) return "both";
    if (hasShop) return "shop";
    return "classes";
  }

  async function saveLeadToDatabase() {
    setError("");
    setPending(true);
    try {
      let logoUrl = form.leadLogoUrl.trim();
      let photoUrls = [...form.leadPhotoUrls];

      if (form.logoFile) {
        const optimized = await optimizeImageForUpload(form.logoFile, { ...STUDIO_LOGO_OPTIMIZE });
        const { secureUrl } = await uploadEarlyAccessImage(optimized);
        logoUrl = secureUrl;
      }

      if (form.photoFiles.length > 0) {
        const next: string[] = [];
        for (const file of form.photoFiles) {
          if (next.length >= 8) break;
          const optimized = await optimizeImageForUpload(file, { ...STUDIO_COVER_OPTIMIZE });
          const { secureUrl } = await uploadEarlyAccessImage(optimized);
          next.push(secureUrl);
        }
        photoUrls = next;
      }

      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          studioName: form.studioName.trim(),
          country: form.country.trim() || "Not specified",
          city: "",
          googleMapsUrl: "",
          logoUrl: logoUrl || "",
          photoUrls,
          websiteOrIg: form.shortDescription.trim(),
          teamSize: form.teamSize.trim() ? Number(form.teamSize.trim()) : null,
          offeringIntent: getEarlyAccessIntent(),
          website: "",
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not save your details. Try again.");
        return false;
      }
      setForm((prev) => ({
        ...prev,
        leadLogoUrl: logoUrl,
        leadPhotoUrls: photoUrls,
        logoFile: null,
        photoFiles: [],
      }));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Try again.");
      return false;
    } finally {
      setPending(false);
    }
  }

  async function handleLooksGood() {
    const ok = await saveLeadToDatabase();
    if (ok) goTo(4);
  }

  async function handleGoogleContinue() {
    const ok = await saveLeadToDatabase();
    if (!ok) return;
    setGooglePending(true);
    try {
      await signIn("google", { callbackUrl: "/dashboard/studio/new?setup=both" });
    } catch {
      setError("Google sign-up is not available right now.");
      setGooglePending(false);
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (accountPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    const ok = await saveLeadToDatabase();
    if (!ok) return;

    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: accountPassword,
          marketingConsent: false,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Could not create your account. Try again.");
        return;
      }
      goTo(6);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  const progressStep = step <= 5 ? step : 5;

  const showError = error ? (
    <p className={ui.errorText} role="alert">
      {error}
    </p>
  ) : null;

  function stepDots(active: number) {
    return (
      <div className="flex items-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
              n === active ? "bg-foreground" : "bg-(--muted)/45"
            }`}
          />
        ))}
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="mx-auto w-full max-w-[560px] space-y-5 rounded-(--radius-card) border border-(--border) bg-(--surface) p-5 sm:p-6">
        <p className="text-center text-2xl" aria-hidden="true">
          🎉
        </p>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Your artist or studio profile is live.</h2>
        <p className="text-sm text-(--muted)">Now let&apos;s make it visible.</p>
        <div className={`${ui.cardMuted} space-y-2`}>
          <ul className="space-y-2 text-sm text-(--muted)">
            <li>Add photos</li>
            <li>Set your first booking</li>
            <li>Share your profile</li>
          </ul>
        </div>
        <div className="space-y-3">
          <Link href="/login?callbackUrl=%2Fdashboard%2Fstudio%2Fnew%3Fsetup%3Dboth" className={`${ui.buttonPrimary} w-full justify-center`}>
            Complete your profile
          </Link>
          <Link href="/login?callbackUrl=%2Fdashboard" className={`${ui.buttonSecondary} w-full justify-center`}>
            View my studio
          </Link>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <form onSubmit={handleCreateAccount} className="mx-auto flex min-h-[560px] w-full max-w-[560px] flex-col rounded-(--radius-card) border border-(--border) bg-(--surface) p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          {stepDots(progressStep)}
          <p className="text-xs text-(--muted)">Step 5 of 5</p>
        </div>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Save your artist or studio profile</h2>
        <div className="mt-4 space-y-4">
          {showError}
          <button
            type="button"
            disabled={pending || googlePending}
            onClick={() => void handleGoogleContinue()}
            className={`${ui.buttonSecondary} w-full justify-center`}
          >
            {googlePending ? "Connecting..." : "Continue with Google"}
          </button>
        </div>
        <div className="mt-4 flex-1 space-y-4">
          <label className="block">
            <span className={ui.label}>Email</span>
            <input className={`${ui.input} mt-2`} type="email" value={form.email} disabled />
          </label>
          <label className="block">
            <span className={ui.label}>Password</span>
            <input
              className={`${ui.input} mt-2`}
              type="password"
              minLength={8}
              required
              disabled={pending}
              placeholder="Password"
              value={accountPassword}
              onChange={(e) => setAccountPassword(e.target.value)}
            />
          </label>
        </div>
        <div className="mt-auto space-y-3 pt-6">
          <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full justify-center`}>
            {pending ? "Creating account..." : "Create account →"}
          </button>
          <button type="button" onClick={() => goTo(4)} className={`${ui.buttonSecondary} w-full justify-center`}>
            Back
          </button>
        </div>
      </form>
    );
  }

  if (step === 4) {
    return (
      <div className="mx-auto flex min-h-[560px] w-full max-w-[560px] flex-col rounded-(--radius-card) border border-(--border) bg-(--surface) p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          {stepDots(progressStep)}
          <p className="text-xs text-(--muted)">Step 4 of 5</p>
        </div>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Start receiving bookings</h2>
        <p className="mt-2 text-sm text-(--muted)">What do you want to offer?</p>
        <div className="mt-4 flex-1 space-y-3">
          {showError}
          {[
            { id: "classes", label: "Classes" },
            { id: "private", label: "Private Sessions" },
            { id: "products", label: "Products" },
            { id: "not_sure", label: "Not sure yet" },
          ].map((option) => (
            <label key={option.id} className={`${ui.cardMuted} flex cursor-pointer items-center gap-3 p-4`}>
              <input
                type="radio"
                name="bookingIntent"
                value={option.id}
                checked={form.bookingIntent === option.id}
                onChange={(e) => setForm((prev) => ({ ...prev, bookingIntent: e.target.value as BookingIntent }))}
                className="h-4 w-4"
              />
              <span className="text-sm text-foreground">{option.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-auto space-y-3 pt-6">
          <button type="button" onClick={() => goTo(5)} className={`${ui.buttonPrimary} w-full justify-center`}>
            Continue →
          </button>
          <button type="button" onClick={() => goTo(3)} className={`${ui.buttonSecondary} w-full justify-center`}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="mx-auto flex min-h-[560px] w-full max-w-[560px] flex-col rounded-(--radius-card) border border-(--border) bg-(--surface) p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          {stepDots(progressStep)}
          <p className="text-xs text-(--muted)">Step 3 of 5</p>
        </div>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">This is how people will see your artist or studio profile</h2>
        <div className="mt-4 flex-1">
          <div className="rounded-(--radius-card) border border-(--border) bg-(--surface-elevated) p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200">
            <p className="text-lg font-semibold text-foreground">{form.studioName || "Studio Name"}</p>
            <p className="mt-1 text-sm text-(--muted)">You can add your map and address from the dashboard</p>
            <p className="mt-3 text-sm text-(--muted)">{form.shortDescription.trim() || "Short description..."}</p>
            <div className="mt-4 h-28 rounded-(--radius-input) border border-(--border) bg-(--surface)" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-emerald-700">Your artist or studio profile is already visible internally.</p>
        {showError}
        <div className="mt-auto space-y-3 pt-6">
          <button
            type="button"
            onClick={() => void handleLooksGood()}
            className={`${ui.buttonPrimary} w-full justify-center`}
            disabled={pending}
          >
            {pending ? "Saving..." : "Looks good →"}
          </button>
          <button type="button" onClick={() => goTo(2)} className={`${ui.buttonSecondary} w-full justify-center`}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (form.offerings.length === 0) {
            setError("Pick at least one offering.");
            return;
          }
          goTo(3);
        }}
        className="mx-auto flex min-h-[560px] w-full max-w-[560px] flex-col rounded-(--radius-card) border border-(--border) bg-(--surface) p-5 sm:p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <button type="button" onClick={() => goTo(1)} className={ui.buttonSecondary}>
            ← Back
          </button>
          <p className="text-xs text-(--muted)">Step 2 of 5</p>
        </div>
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Tell us about your work or studio</h2>
        <div className="mt-4 flex-1 space-y-4">
          {showError}
          <div>
            <p className={ui.label}>What do you offer?</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {[
                { id: "classes", label: "Classes" },
                { id: "workshops", label: "Workshops" },
                { id: "shop", label: "Shop" },
                { id: "mixed", label: "Mixed" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    if (option.id === "mixed") {
                      setForm((prev) => ({ ...prev, offerings: ["classes", "workshops", "shop"] }));
                      return;
                    }
                    toggleOffering(option.id as OfferingIntent);
                  }}
                  className={`min-h-11 rounded-(--radius-input) border px-4 text-left text-sm font-medium transition ${
                    option.id === "mixed"
                      ? form.offerings.length === 3
                        ? "border-(--accent) bg-(--accent-muted) text-foreground"
                        : "border-(--border) text-foreground hover:bg-(--surface-elevated)"
                      : form.offerings.includes(option.id as OfferingIntent)
                        ? "border-(--accent) bg-(--accent-muted) text-foreground"
                        : "border-(--border) text-foreground hover:bg-(--surface-elevated)"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className={ui.label}>Short description (optional)</span>
            <textarea
              className={`${ui.input} mt-2 min-h-24`}
              placeholder="What makes your studio unique?"
              value={form.shortDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
            />
          </label>
          <label className="block">
            <span className={ui.label}>How many people work in the studio or artist practice? (optional)</span>
            <input
              className={`${ui.input} mt-2`}
              type="number"
              min={0}
              step={1}
              value={form.teamSize}
              onChange={(e) => setForm((prev) => ({ ...prev, teamSize: e.target.value }))}
              placeholder="e.g. 3"
            />
          </label>
          <div>
            <span className={ui.label}>Logo (optional)</span>
            <p className="mt-1 text-xs text-(--muted)">Upload a file — we don&apos;t use pasted links here.</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-(--radius-input) border border-(--border) bg-(--surface-elevated) px-3 py-2 text-xs font-medium text-foreground">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={pending}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    setForm((prev) => ({ ...prev, logoFile: f }));
                  }}
                />
                {form.logoFile ? form.logoFile.name : "Choose logo file"}
              </label>
              {form.logoFile || form.leadLogoUrl ? (
                <button
                  type="button"
                  className="text-xs text-(--muted) underline"
                  onClick={() => setForm((prev) => ({ ...prev, logoFile: null, leadLogoUrl: "" }))}
                >
                  Remove
                </button>
              ) : null}
            </div>
            {form.leadLogoUrl && !form.logoFile ? (
              <p className="mt-1 text-xs text-emerald-800">Logo saved. Choose a new file to replace it.</p>
            ) : null}
          </div>
          <div>
            <span className={ui.label}>Studio photos (optional)</span>
            <p className="mt-1 text-xs text-(--muted)">Up to 8 image files (JPEG, PNG, or WebP).</p>
            <label className="mt-2 inline-flex cursor-pointer items-center rounded-(--radius-input) border border-(--border) bg-(--surface-elevated) px-3 py-2 text-xs font-medium text-foreground">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="sr-only"
                disabled={pending}
                onChange={(e) => {
                  const list = Array.from(e.target.files ?? []).slice(0, 8);
                  e.target.value = "";
                  setForm((prev) => ({ ...prev, photoFiles: list }));
                }}
              />
              {form.photoFiles.length > 0
                ? `${form.photoFiles.length} file(s) selected`
                : "Choose photo files"}
            </label>
            {form.leadPhotoUrls.length > 0 && form.photoFiles.length === 0 ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <p className="text-xs text-emerald-800">
                  {form.leadPhotoUrls.length} photo(s) already saved. Choose files to replace.
                </p>
                <button
                  type="button"
                  className="text-xs text-(--muted) underline"
                  onClick={() => setForm((prev) => ({ ...prev, leadPhotoUrls: [] }))}
                >
                  Clear saved photos
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <button type="submit" className={`${ui.buttonPrimary} mt-auto w-full justify-center`}>
          Continue →
        </button>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!form.studioName.trim() || !isValidEmail(form.email)) {
          setError("Enter artist or studio name and a valid email.");
          return;
        }
        goTo(2);
      }}
      className="mx-auto flex min-h-[560px] w-full max-w-[560px] flex-col rounded-(--radius-card) border border-(--border) bg-(--surface) p-5 sm:p-6"
    >
      <div className="mb-5">{stepDots(progressStep)}</div>
      <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Create your artist or studio profile</h2>
      <p className="mt-2 text-sm text-(--muted)">Takes 2 minutes. You can edit everything later.</p>
      <div className="mt-5 flex-1 space-y-4">
        {showError}
        <label className="block">
          <span className={ui.label}>Artist or studio name</span>
          <input
            className={`${ui.input} mt-2`}
            type="text"
            required
            autoFocus
            value={form.studioName}
            onChange={(e) => setForm((prev) => ({ ...prev, studioName: e.target.value }))}
            placeholder="Artist or studio name"
          />
        </label>
        <label className="block">
          <span className={ui.label}>Country or region (optional)</span>
          <input
            className={`${ui.input} mt-2`}
            type="text"
            autoComplete="country-name"
            value={form.country}
            onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))}
            placeholder="e.g. Portugal"
          />
        </label>
        <label className="block">
          <span className={ui.label}>Email</span>
          <input
            className={`${ui.input} mt-2`}
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
            placeholder="Email"
          />
        </label>
      </div>
      <button type="submit" className={`${ui.buttonPrimary} mt-auto w-full justify-center`}>
        Continue →
      </button>
      <div className="mt-4 text-center text-sm text-(--muted)">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Log in
        </Link>
      </div>
    </form>
  );
}
