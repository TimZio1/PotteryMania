"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { getGaMeasurementId } from "@/lib/ga-config";
const CONSENT_COOKIE = "pm_cookie_consent";
const DEFAULT_LINK_DOMAINS = ["potterymania.com"];

function resolveLinkDomains(): string[] {
  const raw = process.env.NEXT_PUBLIC_GA_LINK_DOMAINS;
  if (!raw) return DEFAULT_LINK_DOMAINS;
  const parsed = raw
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : DEFAULT_LINK_DOMAINS;
}

function hasAnalyticsConsent(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split(";")
    .map((chunk) => chunk.trim())
    .some((chunk) => chunk === `${CONSENT_COOKIE}=accepted`);
}

export function GoogleAnalytics() {
  const [enabled, setEnabled] = useState(false);
  const gaId = getGaMeasurementId();
  const linkDomains = resolveLinkDomains();
  const linkerDomainsJson = JSON.stringify(linkDomains);

  useEffect(() => {
    if (!gaId) return;
    const sync = () => setEnabled(hasAnalyticsConsent());
    sync();
    window.addEventListener("pm-consent-changed", sync);
    return () => window.removeEventListener("pm-consent-changed", sync);
  }, [gaId]);

  if (!gaId || !enabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', {
            send_page_view: true,
            linker: { domains: ${linkerDomainsJson} }
          });
        `}
      </Script>
    </>
  );
}
