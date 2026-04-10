/** Keys required for full studio registration (matches `POST /api/studios` non–quick-start rules). */
export const STUDIO_FULL_REQUIRED_KEYS = [
  "displayName",
  "legalBusinessName",
  "vatNumber",
  "responsiblePersonName",
  "email",
  "country",
  "city",
  "addressLine1",
] as const;

export type StudioFullRequiredKey = (typeof STUDIO_FULL_REQUIRED_KEYS)[number];

export function missingStudioFullFields(data: Record<string, string | undefined | null>): StudioFullRequiredKey[] {
  return STUDIO_FULL_REQUIRED_KEYS.filter((k) => {
    const v = data[k];
    return typeof v !== "string" || !v.trim();
  });
}

export function validateStudioQuickFields(data: {
  displayName: string;
  country: string;
  email: string;
}): { ok: true } | { ok: false; message: string } {
  if (!data.displayName?.trim()) {
    return { ok: false, message: "Studio name is required." };
  }
  if (!data.country?.trim()) {
    return { ok: false, message: "Country is required." };
  }
  if (!data.email?.trim()) {
    return { ok: false, message: "Contact email is required." };
  }
  return { ok: true };
}
