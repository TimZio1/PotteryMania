"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { WEAR_EVENT_KINDS, trackWearEvent } from "@/lib/wear-analytics-client";
import { setWearPartnerReferralStudioId } from "@/lib/wear-referral-storage";

const PARAM_KEYS = ["ref", "studio", "studioId"] as const;

function firstValidReferralId(searchParams: URLSearchParams): string | null {
  for (const key of PARAM_KEYS) {
    const v = searchParams.get(key)?.trim();
    if (v && /^[a-zA-Z0-9_-]{6,128}$/.test(v)) return v;
  }
  return null;
}

/** Captures `?ref=` / `?studio=` / `?studioId=` on wear routes; 30-day persistence in `lib/wear-referral-storage`. */
export function WearReferralCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname() ?? "";

  useEffect(() => {
    const id = firstValidReferralId(searchParams);
    if (!id) return;
    setWearPartnerReferralStudioId(id);
    trackWearEvent(WEAR_EVENT_KINDS.referralCaptured, {
      meta: {
        referring_studio_id: id,
        path: pathname.slice(0, 500),
      },
    });
  }, [searchParams, pathname]);

  return null;
}
