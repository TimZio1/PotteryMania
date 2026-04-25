"use client";

import { useState } from "react";
import { uploadImage } from "@/lib/client-upload";
import { optimizeImageForUpload } from "@/lib/optimize-image-client";
import {
  STUDIO_BRAND_CLOUDINARY_FOLDER,
  STUDIO_COVER_OPTIMIZE,
  STUDIO_LOGO_OPTIMIZE,
} from "@/lib/studio-brand-media";

type Props = {
  kind: "logo" | "cover";
  label: string;
  requirements: string;
  value: string;
  onChange: (url: string) => void;
};

export function StudioBrandImageField({ kind, label, requirements, value, onChange }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(true);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setMsg("");
    setBusy(true);
    try {
      const opts = kind === "logo" ? STUDIO_LOGO_OPTIMIZE : STUDIO_COVER_OPTIMIZE;
      const optimized = await optimizeImageForUpload(file, { ...opts });
      const { secureUrl } = await uploadImage(optimized, STUDIO_BRAND_CLOUDINARY_FOLDER);
      onChange(secureUrl);
      setMsgOk(true);
      setMsg("Uploaded and optimized. Save the form to keep it on your studio profile.");
    } catch (err) {
      setMsgOk(false);
      setMsg(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="block space-y-1 text-sm">
      <span className="text-[var(--muted)]">{label}</span>
      <p className="text-xs leading-relaxed text-[var(--muted)]">{requirements}</p>
      {value ? (
        <div className="mt-2 flex flex-wrap items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- remote studio-owned URL from our uploader */}
          <img src={value} alt="" className="h-16 w-16 rounded-md border border-stone-200 object-contain" />
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <label className="inline-flex cursor-pointer items-center rounded border border-amber-800/30 bg-stone-50 px-3 py-1.5 text-xs font-medium text-amber-950 hover:bg-stone-100">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={onPick} />
          {busy ? "Optimizing & uploading…" : value ? "Replace image" : "Upload image"}
        </label>
        {value ? (
          <>
            <span className="text-xs text-emerald-800">Image added</span>
            <button type="button" className="text-xs text-stone-600 underline" disabled={busy} onClick={() => onChange("")}>
              Remove
            </button>
          </>
        ) : (
          <span className="text-xs text-stone-400">Optional until you publish</span>
        )}
      </div>
      {msg ? <p className={`text-xs ${msgOk ? "text-emerald-800" : "text-rose-700"}`}>{msg}</p> : null}
    </div>
  );
}
