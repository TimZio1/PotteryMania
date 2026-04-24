"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { ui } from "@/lib/ui-styles";

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
    location: "",
    offerings: [] as OfferingIntent[],
    shortDescription: "",
    teamSize: "",
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
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          studioName: form.studioName.trim(),
          country: form.location.trim(),
          city: "",
          googleMapsUrl: "",
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
      return true;
    } catch {
      setError("Network error. Try again.");
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
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Your studio is live.</h2>
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
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Save your studio</h2>
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
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">This is how people will see your studio</h2>
        <div className="mt-4 flex-1">
          <div className="rounded-(--radius-card) border border-(--border) bg-(--surface-elevated) p-4 shadow-[0_8px_24px_rgba(0,0,0,0.25)] transition-all duration-200">
            <p className="text-lg font-semibold text-foreground">{form.studioName || "Studio Name"}</p>
            <p className="mt-1 text-sm text-(--muted)">{form.location || "Location"}</p>
            <p className="mt-3 text-sm text-(--muted)">{form.shortDescription.trim() || "Short description..."}</p>
            <div className="mt-4 h-28 rounded-(--radius-input) border border-(--border) bg-(--surface)" />
          </div>
        </div>
        <p className="mt-3 text-xs font-medium text-emerald-700">Your studio is already visible internally.</p>
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
        <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Tell us about your studio</h2>
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
            <span className={ui.label}>How many people work in the studio? (optional)</span>
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
        if (!form.studioName.trim() || !form.location.trim() || !isValidEmail(form.email)) {
          setError("Enter studio name, location, and a valid email.");
          return;
        }
        goTo(2);
      }}
      className="mx-auto flex min-h-[560px] w-full max-w-[560px] flex-col rounded-(--radius-card) border border-(--border) bg-(--surface) p-5 sm:p-6"
    >
      <div className="mb-5">{stepDots(progressStep)}</div>
      <h2 className="font-serif text-2xl text-foreground sm:text-3xl">Create your studio profile</h2>
      <p className="mt-2 text-sm text-(--muted)">Takes 2 minutes. You can edit everything later.</p>
      <div className="mt-5 flex-1 space-y-4">
        {showError}
        <label className="block">
          <span className={ui.label}>Studio name</span>
          <input
            className={`${ui.input} mt-2`}
            type="text"
            required
            autoFocus
            value={form.studioName}
            onChange={(e) => setForm((prev) => ({ ...prev, studioName: e.target.value }))}
            placeholder="Studio name"
          />
        </label>
        <label className="block">
          <span className={ui.label}>Location</span>
          <input
            className={`${ui.input} mt-2`}
            type="text"
            required
            value={form.location}
            onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
            placeholder="Location"
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
