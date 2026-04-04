"use client";

import { useCallback, useState } from "react";
import { getGa4PropertyId, getGaMeasurementId, getGaStreamLabel, ga4ReportUrl } from "@/lib/ga-config";
import { ui } from "@/lib/ui-styles";

export function HyperadminGoogleAnalytics() {
  const measurementId = getGaMeasurementId();
  const propertyId = getGa4PropertyId();
  const streamLabel = getGaStreamLabel();
  const [copied, setCopied] = useState(false);

  const copyId = useCallback(async () => {
    if (!measurementId) return;
    try {
      await navigator.clipboard.writeText(measurementId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [measurementId]);

  if (!measurementId) {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 shadow-sm">
        <p className="text-sm font-semibold text-amber-950">Google Analytics 4</p>
        <p className="mt-2 text-sm leading-6 text-stone-700">
          Set <code className="rounded bg-white/80 px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_GA_ID</code> in your
          deployment environment (e.g. <code className="font-mono text-xs">G-J3SSPW322R</code>) so the site tag and
          this panel can reference your measurement ID.
        </p>
      </div>
    );
  }

  const links: { label: string; href: string; note?: string }[] = [
    { label: "Google Analytics (home)", href: "https://analytics.google.com/analytics/web/", note: "Pick property if needed" },
  ];

  if (propertyId) {
    links.push(
      { label: "Realtime", href: ga4ReportUrl(propertyId, "realtime-overview") },
      { label: "Traffic acquisition", href: ga4ReportUrl(propertyId, "traffic-acquisition") },
      { label: "Pages & screens", href: ga4ReportUrl(propertyId, "engagement-pages-screens") },
      { label: "Events", href: ga4ReportUrl(propertyId, "engagement-events") },
      { label: "Demographics overview", href: ga4ReportUrl(propertyId, "user-demographics-overview") },
    );
  }

  links.push({
    label: "Admin → Data streams",
    href: "https://analytics.google.com/analytics/web/#/admin",
    note: "Configure streams & measurement",
  });

  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-amber-950">Google Analytics 4</p>
          <p className="mt-1 text-sm text-stone-600">
            Live site traffic uses the gtag snippet in the root layout. Open GA4 for full reports and exploration.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={copyId}
            className={`${ui.buttonSecondary} w-full sm:w-auto text-xs`}
          >
            {copied ? "Copied" : "Copy measurement ID"}
          </button>
          <p className="font-mono text-xs text-stone-600">{measurementId}</p>
          {streamLabel ? <p className="text-xs text-stone-500">{streamLabel}</p> : null}
        </div>
      </div>

      {!propertyId ? (
        <p className="mt-4 rounded-2xl border border-stone-100 bg-stone-50/90 p-4 text-sm text-stone-600">
          Add{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">NEXT_PUBLIC_GA4_PROPERTY_ID</code> (numeric
          ID from GA → Admin → Property settings) to enable one-click links to Realtime, Acquisition, and Engagement
          reports.
        </p>
      ) : null}

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {links.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col rounded-2xl border border-stone-200 bg-stone-50/50 px-4 py-3 text-sm font-medium text-amber-950 transition hover:border-amber-300 hover:bg-amber-50/40"
            >
              <span className="flex items-center justify-between gap-2">
                {item.label}
                <span className="text-stone-400" aria-hidden>
                  ↗
                </span>
              </span>
              {item.note ? <span className="mt-1 text-xs font-normal text-stone-500">{item.note}</span> : null}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
