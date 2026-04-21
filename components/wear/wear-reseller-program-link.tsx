"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { isWearResellerApplicationExternalHref } from "@/lib/wear-reseller-application";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type Props = {
  href: string;
  className: string;
  children: ReactNode;
};

export function WearResellerProgramLink({ href, className, children }: Props) {
  const external = isWearResellerApplicationExternalHref(href);

  function handleClick() {
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "wear_reseller_application", {
        event_category: "wear",
        link_url: href,
      });
    }
  }

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className} onClick={handleClick}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
