"use client";

/**
 * Small client-side trigger to re-open the cookie consent banner after a user
 * has already accepted or declined. Required for GDPR/CCPA: consent must be as
 * easy to withdraw as it is to give.
 */
export function CookieSettingsButton({ className }: { className?: string }) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        document.cookie = "pm_cookie_consent=; path=/; max-age=0; samesite=lax";
        window.dispatchEvent(new CustomEvent("pm-open-cookie-settings"));
      }}
    >
      Cookie settings
    </button>
  );
}
