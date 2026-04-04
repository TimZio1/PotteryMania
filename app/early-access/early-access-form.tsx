"use client";

import { useState, useCallback } from "react";
import { ui } from "@/lib/ui-styles";
import { uploadImage } from "@/lib/client-upload";
import {
  EUROPEAN_PREREGISTRATION_COUNTRIES,
  EUROPEAN_PREREGISTRATION_NOTE,
} from "@/lib/european-preregistration";

const MAX_PHOTOS = 3;
const MAX_FILE_MB = 5;

export function EarlyAccessForm() {
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
      setDone(true);
    } catch (error) {
      if (error instanceof Error && error.message === "Hosted uploads are not configured") {
        setErr("Photo uploads are temporarily unavailable. You can still register without photos.");
      } else {
        setErr("Network error. Please try again.");
      }
      setPending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <svg className="h-8 w-8 text-emerald-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="mt-6 text-2xl font-semibold text-amber-950">You&apos;re on the list!</h2>
        <p className="mt-3 text-stone-600">
          We&apos;ll reach out soon with next steps. In the meantime, follow us for updates.
        </p>
        {uploadNotice ? <p className="mt-3 text-sm font-medium text-amber-800">{uploadNotice}</p> : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {err && <p className={ui.errorText}>{err}</p>}

      {/* Email */}
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

      {/* Studio name */}
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
        <p className="mt-2 text-xs text-stone-500">{EUROPEAN_PREREGISTRATION_NOTE}</p>
      </div>

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
          placeholder="instagram.com/yourstudio or www.yourstudio.com"
        />
      </div>

      {/* Photos */}
      <div>
        <span className={ui.label}>Upload up to 3 photos</span>
        <p className="mt-1 text-xs text-stone-500">Show us your work — ceramics, studio, classes. Max {MAX_FILE_MB}MB each.</p>
        <p className="mt-1 text-xs text-stone-500">Photos are optional. If hosted uploads are unavailable, we&apos;ll still save your registration.</p>

        {photos.length > 0 && (
          <div className="mt-3 flex gap-3">
            {photos.map((p, i) => (
              <div key={i} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-stone-200 bg-stone-100 sm:h-28 sm:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                  aria-label={`Remove photo ${i + 1}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {photos.length < MAX_PHOTOS && (
          <label className="mt-3 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-stone-300 bg-stone-50 px-4 py-2.5 text-sm font-medium text-stone-700 transition hover:border-amber-400 hover:bg-amber-50/40">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
        <legend className={ui.label}>I&apos;m interested in…</legend>
        <div className="mt-3 space-y-3">
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm transition hover:border-amber-300 has-checked:border-amber-400 has-checked:bg-amber-50/40">
            <input
              type="checkbox"
              checked={wantBooking}
              onChange={(e) => setWantBooking(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-stone-300 text-amber-900 accent-amber-900"
            />
            <span>Booking system — let customers book classes online</span>
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm transition hover:border-amber-300 has-checked:border-amber-400 has-checked:bg-amber-50/40">
            <input
              type="checkbox"
              checked={wantMarket}
              onChange={(e) => setWantMarket(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-stone-300 text-amber-900 accent-amber-900"
            />
            <span>Marketplace — sell ceramics to a global audience</span>
          </label>
          <label className="flex min-h-11 items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm transition hover:border-amber-300 has-checked:border-amber-400 has-checked:bg-amber-50/40">
            <input
              type="checkbox"
              checked={wantBoth}
              onChange={(e) => setWantBoth(e.target.checked)}
              disabled={pending}
              className="h-4 w-4 rounded border-stone-300 text-amber-900 accent-amber-900"
            />
            <span>Both — the full platform</span>
          </label>
        </div>
      </fieldset>

      <button type="submit" disabled={pending} className={`${ui.buttonPrimary} w-full`}>
        {pending ? "Submitting…" : "Register Your Studio — Free"}
      </button>

      <p className="text-center text-xs text-stone-400">
        No commitment. No credit card. We&apos;ll invite you when we launch.
      </p>
    </form>
  );
}
