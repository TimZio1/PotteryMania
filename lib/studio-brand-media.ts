/** Client-side resize targets before Cloudinary upload (URLs are stored on `Studio.logoUrl` / `coverImageUrl`). */

export const STUDIO_LOGO_OPTIMIZE = { maxWidth: 512, maxHeight: 512, quality: 0.82, maxInputBytes: 12_000_000 } as const;

export const STUDIO_COVER_OPTIMIZE = { maxWidth: 1920, maxHeight: 1080, quality: 0.82, maxInputBytes: 15_000_000 } as const;

export const STUDIO_BRAND_CLOUDINARY_FOLDER = "potterymania/studio-brand";

export function studioLogoRequirementsText(): string {
  return "JPEG, PNG, or WebP · up to 12 MB · square or near-square works best (min. ~200×200 px). We resize to max 512×512 before upload to keep your page fast.";
}

export function studioCoverRequirementsText(): string {
  return "JPEG, PNG, or WebP · up to 15 MB · wide banner (about 16∶9 or 3∶1, e.g. 1600×600–2400×900) works best. We resize to max 1920×1080 before upload.";
}
