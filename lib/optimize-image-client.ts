"use client";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type OptimizeImageOpts = {
  maxWidth: number;
  maxHeight: number;
  /** JPEG quality 0–1 */
  quality?: number;
  /** Reject originals larger than this (bytes) */
  maxInputBytes?: number;
};

/**
 * Downscale and re-encode as JPEG in the browser so Cloudinary / bandwidth / DB URL payloads stay light.
 */
export async function optimizeImageForUpload(file: File, opts: OptimizeImageOpts): Promise<File> {
  const maxIn = opts.maxInputBytes ?? 15_000_000;
  if (file.size > maxIn) {
    throw new Error(`Image is too large (max ${Math.round(maxIn / 1_000_000)} MB before optimization).`);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Please use a JPEG, PNG, or WebP image.");
  }

  const bitmap = await createImageBitmap(file);
  try {
    const { maxWidth, maxHeight } = opts;
    const quality = opts.quality ?? 0.82;
    let { width, height } = bitmap;
    const scale = Math.min(1, maxWidth / width, maxHeight / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process this image in your browser.");
    ctx.drawImage(bitmap, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", quality);
    });
    if (!blob) throw new Error("Could not compress this image.");

    const base = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${base}-optimized.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
