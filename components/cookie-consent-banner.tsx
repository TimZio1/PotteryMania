"use client";

import { useEffect, useState } from "react";

const CONSENT_COOKIE = "pm_cookie_consent";
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

function getConsentValue(): "accepted" | "declined" | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .find((chunk) => chunk.startsWith(`${CONSENT_COOKIE}=`));
  if (!raw) return null;
  const value = decodeURIComponent(raw.slice(`${CONSENT_COOKIE}=`.length));
  if (value === "accepted" || value === "declined") return value;
  return null;
}

function setConsentValue(value: "accepted" | "declined") {
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(value)}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; samesite=lax`;
  window.dispatchEvent(new CustomEvent("pm-consent-changed", { detail: value }));
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsentValue() === null);
    const onReopen = () => setVisible(true);
    window.addEventListener("pm-open-cookie-settings", onReopen);
    return () => window.removeEventListener("pm-open-cookie-settings", onReopen);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-200 border-t border-[var(--border)] bg-[var(--surface)]/95 px-4 py-4 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]">
          We use analytics cookies to see what&apos;s working. Login and checkout cookies stay on no matter what.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-elevated)]"
            onClick={() => {
              setConsentValue("declined");
              setVisible(false);
            }}
          >
            Only essential
          </button>
          <button
            type="button"
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
            onClick={() => {
              setConsentValue("accepted");
              setVisible(false);
            }}
          >
            Allow analytics
          </button>
        </div>
      </div>
    </div>
  );
}
