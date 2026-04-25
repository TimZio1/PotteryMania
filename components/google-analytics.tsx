"use client";

import Script from "next/script";
import { Suspense, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getGaMeasurementId } from "@/lib/ga-config";

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

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Single-page App: re-send a page view on client navigations (first load is handled by
 * the inline gtag config; we skip the first effect run to avoid a duplicate hit).
 */
function Ga4SpaPageViews({ measurementId }: { measurementId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirst = useRef(true);

  useEffect(() => {
    const run = () => {
      if (typeof window.gtag !== "function") return;
      const q = searchParams.toString();
      const pagePath = q ? `${pathname}?${q}` : pathname;
      if (isFirst.current) {
        isFirst.current = false;
        return;
      }
      window.gtag("config", measurementId, {
        page_path: pagePath,
      });
    };
    // Defer to after gtag is defined (script order).
    const t = window.setTimeout(run, 0);
    return () => window.clearTimeout(t);
  }, [measurementId, pathname, searchParams]);

  return null;
}

export function GoogleAnalytics() {
  const gaId = getGaMeasurementId();
  const linkDomains = resolveLinkDomains();
  const linkerDomainsJson = JSON.stringify(linkDomains);

  if (!gaId) return null;

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
      <Suspense fallback={null}>
        <Ga4SpaPageViews measurementId={gaId} />
      </Suspense>
    </>
  );
}
