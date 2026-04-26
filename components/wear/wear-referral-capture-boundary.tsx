import { Suspense } from "react";
import { WearReferralCapture } from "@/components/wear/wear-referral-capture";

/** `useSearchParams` must be under Suspense in the App Router. */
export function WearReferralCaptureBoundary() {
  return (
    <Suspense fallback={null}>
      <WearReferralCapture />
    </Suspense>
  );
}
