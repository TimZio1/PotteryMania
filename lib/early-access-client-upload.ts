"use client";

/**
 * Unauthenticated image upload for the early-access / private guide flow.
 * Server validates type & size, signs Cloudinary, returns HTTPS URL.
 */
export async function uploadEarlyAccessImage(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/early-access/upload-image", {
    method: "POST",
    body: formData,
  });
  const j = (await res.json()) as { secureUrl?: string; error?: string };
  if (!res.ok) {
    throw new Error(j.error || "Upload failed");
  }
  if (!j.secureUrl) {
    throw new Error("Upload did not return an image address.");
  }
  return { secureUrl: j.secureUrl };
}
