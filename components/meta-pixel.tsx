"use client";

import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/**
 * Meta issue report filename confirms the production pixel id:
 * catalog622117933589214_pixel1956916491397785 (Commerce catalog + pixel).
 * Events Manager may also show Conversions API app SDK ID 916229323648933 — browser pixel still uses only the pixel id below.
 *
 * Keep env override for future migrations, but don't let a missing Railway
 * NEXT_PUBLIC_META_PIXEL_ID silently disable every catalog event.
 */
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || "1956916491397785";
const CONSENT_COOKIE = "pm_cookie_consent";

function hasAnalyticsConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .some((chunk) => chunk === `${CONSENT_COOKIE}=accepted`);
}

function MetaPixelRouteCapture() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastKey = useRef<string | null>(null);

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    const search = searchParams?.toString() ?? "";
    const key = `${pathname}${search ? `?${search}` : ""}`;
    if (lastKey.current === null) {
      lastKey.current = key;
      return;
    }
    if (lastKey.current === key) return;
    lastKey.current = key;
    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return null;
}

export function MetaPixel() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (!META_PIXEL_ID) return;
    const sync = () => setEnabled(hasAnalyticsConsent());
    sync();
    window.addEventListener("pm-consent-changed", sync);
    return () => window.removeEventListener("pm-consent-changed", sync);
  }, []);

  if (!META_PIXEL_ID || !enabled) return null;

  return (
    <>
      <Script
        id="meta-pixel-base"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');
fbq('track','PageView');
          `.trim(),
        }}
      />
      <Suspense fallback={null}>
        <MetaPixelRouteCapture />
      </Suspense>
    </>
  );
}
