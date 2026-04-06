"use client";

import type { ReactNode } from "react";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Props = {
  href: string;
  children: ReactNode;
  className?: string;
  eventName?: string;
};

/** Same-tab Spreadshop; optional GA4 custom event for funnel metrics. */
export function WearOutboundLink({ href, children, className, eventName = "wear_spreadshop_outbound" }: Props) {
  function handleClick() {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", eventName, {
        event_category: "wear",
        link_url: href,
      });
    }
  }

  if (!href) {
    return (
      <span
        className={`${className ?? ""} inline-flex cursor-not-allowed opacity-50`}
        title="Set NEXT_PUBLIC_SPREADSHOP_URL in your environment to enable the collection link."
      >
        {children}
      </span>
    );
  }

  return (
    <a href={href} className={className} onClick={handleClick}>
      {children}
    </a>
  );
}
