"use client";

import { useState, useCallback, useEffect } from "react";
import { ui } from "@/lib/ui-styles";
import { uploadImage } from "@/lib/client-upload";
import {
  EUROPEAN_PREREGISTRATION_COUNTRIES,
} from "@/lib/european-preregistration";
import { trackMetaPixelEvent } from "@/lib/meta-pixel";

const MAX_PHOTOS = 3;
const MAX_FILE_MB = 5;
const COUNTER_BASE = 123;

function readMetaCookie(name: "_fbc" | "_fbp"): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  if (!match?.[1]) return undefined;
  try {
    return decodeURIComponent(match[1].trim()).slice(0, 256);
  } catch {
    return match[1].trim().slice(0, 256);
  }
}

export function EarlyAccessForm({ initialCount = 0 }: { initialCount?: number }) {
  const [email, setEmail] = useState("");
  const [studioName, setStudioName] = useState("");
  const [country, setCountry] = useState("");
  const [websiteOrIg, setWebsiteOrIg] = useState("");
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [wantBooking, setWantBooking] = useState(false);
  const [wantMarket, setWantMarket] = useState(false);
  const [wantBoth, setWantBoth] = useState(false);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const [showOptional, setShowOptional] = useState(false);
  const [count, setCount] = useState(COUNTER_BASE + initialCount);

  useEffect(() => {
    fetch("/api/early-access/count")
      .then((r) => r.json())
      .then((d) => { if (typeof d.count === "number") setCount(COUNTER_BASE + d.count); })
      .catch(() => {});
  }, []);

  const onFiles = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const remaining = MAX_PHOTOS - photos.length;
      const valid = files
        .filter((f) => f.type.startsWith("image/") && f.size <= MAX_FILE_MB * 1024 * 1024)
        .slice(0, remaining);
      const newPhotos = valid.map((file) => ({ file, preview: URL.createObjectURL(file) }));
      setPhotos((prev) => [...prev, ...newPhotos]);
      e.target.value = "";
    },
    [photos.length],
  );

  function removePhoto(idx: number) {
    setPhotos((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setUploadNotice("");
    setPending(true);

    try {
      const photoUrls: string[] = [];
      let uploadsSkipped = false;
      for (const p of photos) {
        try {
          const uploaded = await uploadImage(p.file, "potterymania/early-access");
          photoUrls.push(uploaded.secureUrl);
        } catch (error) {
          if (error instanceof Error && error.message === "Hosted uploads are not configured") {
            uploadsSkipped = true;
            break;
          }
          throw error;
        }
      }

      const r = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          studioName,
          country,
          websiteOrIg: websiteOrIg || undefined,
          photoUrls,
          wantBooking,
          wantMarket,
          wantBoth,
          metaEventId,
          metaFbc: readMetaCookie("_fbc"),
          metaFbp: readMetaCookie("_fbp"),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Something went wrong");
        setPending(false);
        return;
      }
      if (uploadsSkipped) {
        setUploadNotice("Photo uploads are temporarily unavailable, so we saved your registration without photos.");
      }
      setCount((c) => c + 1);
      setDone(true);
      trackMetaPixelEvent("Lead", { content_name: "early_access" }, { eventID: metaEventId });
    } catch (error) {
      if (error instanceof Error && error.message === "Hosted uploads are not configured") {
        setErr("Photo uploads are temporarily unavailable. You can still register without photos.");
      } else {
        setErr("Network error. Please try again.");
      }
      setPending(false);
    }
  }

  /* ── Success state ── */
  if (done) {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-7 w-7 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-5 font-serif text-2xl text-amber-950 sm:text-3xl">Welcome.</h2>
        <p className="mt-3 text-sm leading-7 text-stone-600">
          Your studio is on the list. We&apos;ll reach out with next steps before launch.
        </p>
        {uploadNotice && <p className="mt-3 text-sm font-medium text-amber-800">{uploadNotice}</p>}
        {count > 0 && (
          <p className="mt-4 text-base font-semibold text-stone-700 sm:text-lg">
            {count} {count === 1 ? "studio" : "studios"} registered so far.
          </p>
        )}
      </div>
    );
  }

  /* ── Form ── */
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {err && <p className={ui.errorText}>{err}</p>}

      {/* Email + Studio name side by side on desktop */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={ui.label} htmlFor="ea-email">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="ea-email"
            type="email"
            autoComplete="email"
            required
            disabled={pending}
            className={`${ui.input} mt-1`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@studio.com"
          />
        </div>
        <div>
          <label className={ui.label} htmlFor="ea-studio">
            Studio name <span className="text-red-500">*</span>
          </label>
          <input
            id="ea-studio"
            type="text"
            required
            disabled={pending}
            className={`${ui.input} mt-1`}
            value={studioName}
            onChange={(e) => setStudioName(e.target.value)}
            placeholder="Clay & Co"
          />
        </div>
      </div>

      {/* Country */}
      <div>
        <label className={ui.label} htmlFor="ea-country">
          Country <span className="text-red-500">*</span>
        </label>
        <select
          id="ea-country"
          required
          disabled={pending}
          className={`${ui.input} mt-1`}
          value={country}
          onChange={(e) => setCountry(e.target.value)}
        >
          <option value="">Select your country</option>
          {EUROPEAN_PREREGISTRATION_COUNTRIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {/* Optional fields toggle */}
      {!showOptional && (
        <button
          type="button"
          onClick={() => setShowOptional(true)}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-stone-200 bg-stone-50/80 py-2.5 text-xs font-medium text-stone-500 transition hover:border-amber-300 hover:text-stone-700"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add more details (optional)
        </button>
      )}

      {showOptional && (
        <div className="space-y-4 rounded-xl border border-stone-100 bg-stone-50/60 p-4">
          {/* Website / Instagram */}
          <div>
            <label className={ui.label} htmlFor="ea-web">
              Website or Instagram
            </label>
            <input
              id="ea-web"
              type="text"
              disabled={pending}
              className={`${ui.input} mt-1`}
              value={websiteOrIg}
              onChange={(e) => setWebsiteOrIg(e.target.value)}
              placeholder="instagram.com/yourstudio"
            />
          </div>

          {/* Photos */}
          <div>
            <span className={ui.label}>Upload up to 3 photos</span>
            <p className="mt-1 text-xs text-stone-500">
              Show us your work. Max {MAX_FILE_MB}MB each. Optional.
            </p>

            {photos.length > 0 && (
              <div className="mt-3 flex gap-3">
                {photos.map((p, i) => (
                  <div
                    key={i}
                    className="group relative h-20 w-20 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 sm:h-24 sm:w-24"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.preview} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-xs text-white opacity-0 transition group-hover:opacity-100"
                      aria-label={`Remove photo ${i + 1}`}
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < MAX_PHOTOS && (
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white px-3 py-2 text-xs font-medium text-stone-600 transition hover:border-amber-400 hover:bg-amber-50/40">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add photo{photos.length > 0 ? ` (${MAX_PHOTOS - photos.length} left)` : "s"}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onFiles}
                  className="sr-only"
                  disabled={pending}
                />
              </label>
            )}
          </div>

          {/* Interests */}
          <fieldset>
            <legend className={ui.label}>I&apos;m interested in&hellip;</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              <InterestChip label="Booking system" checked={wantBooking} onChange={setWantBooking} disabled={pending} />
              <InterestChip label="Marketplace" checked={wantMarket} onChange={setWantMarket} disabled={pending} />
              <InterestChip label="Both" checked={wantBoth} onChange={setWantBoth} disabled={pending} />
            </div>
          </fieldset>
        </div>
      )}

      {/* CTA */}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-amber-950 px-6 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-amber-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-950 disabled:pointer-events-none disabled:opacity-45"
      >
        {pending ? "Securing\u2026" : "Secure your spot"}
      </button>

      {/* Trust + counter */}
      <div className="flex flex-col items-center gap-3 border-t border-stone-200/80 pt-5">
        <p className="text-center text-base font-semibold leading-snug text-stone-800 sm:text-lg">
          No credit card. No commitment. Cancel anytime.
        </p>
        {count > 0 && (
          <p className="flex items-center justify-center gap-2 text-center text-base font-semibold text-stone-900 sm:text-lg">
            <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            {count} {count === 1 ? "studio" : "studios"} already registered
          </p>
        )}
      </div>
    </form>
  );
}

function InterestChip({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
        checked
          ? "border-amber-400 bg-amber-50 text-amber-900"
          : "border-stone-200 bg-white text-stone-600 hover:border-amber-300"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      {label}
    </label>
  );
}
