"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

/**
 * After studio creation, `?onboarding=1` shows a shareable public URL and next-step hints (<10 min to value).
 */
export function OnboardingShareBanner({ studioId }: { studioId: string }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [absoluteUrl, setAbsoluteUrl] = useState("");

  const show = searchParams.get("onboarding") === "1";
  const publicPath = `/studios/${studioId}`;

  useEffect(() => {
    setAbsoluteUrl(`${window.location.origin}${publicPath}`);
  }, [publicPath]);

  const publicUrl = absoluteUrl || publicPath;

  const profileIncomplete = searchParams.get("profile") === "incomplete";

  const clearQuery = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("onboarding");
    q.delete("profile");
    const s = q.toString();
    router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [publicUrl]);

  if (!show) return null;

  return (
    <div className="mb-6 space-y-3">
      {profileIncomplete ? (
        <div className="rounded-(--pm-radius-card) border border-amber-300/70 bg-amber-50/90 p-(--pm-space-4) text-sm text-stone-700 sm:p-(--pm-space-5)">
          <p className="font-semibold text-amber-950">Finish business details before payouts</p>
          <p className="mt-1 text-stone-600">
            You started with quick setup. Add your full address, tax ID, and legal name in Studio profile when you&apos;re
            ready to connect Stripe and receive money.
          </p>
          <Link
            href={`/dashboard/studio/${studioId}`}
            className="mt-2 inline-block text-sm font-semibold text-amber-950 underline underline-offset-2 hover:text-amber-800"
          >
            Complete studio profile →
          </Link>
        </div>
      ) : null}
      <div className="rounded-(--pm-radius-card) border border-emerald-200 bg-emerald-50/95 p-(--pm-space-4) sm:p-(--pm-space-5)">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-700">
              Your studio is ready
            </p>
            <p className="mt-1 text-sm font-medium text-stone-900">Your public studio page is live. Share your link to start getting bookings.</p>
            <p className="mt-2 text-sm text-stone-600">
              <span className="font-mono text-xs break-all sm:text-sm">{publicUrl}</span>
            </p>
            <p className="mt-3 text-sm text-stone-600">
              New: use the step-by-step helper — add a listing, a class, or payouts without digging through menus.
            </p>
            <p className="mt-2 text-sm text-stone-600">
              Want your own storefront domain? Add it in studio settings once your studio is approved.
            </p>
            <Link
              href={`/dashboard/${studioId}/guided`}
              className="mt-2 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              Open simple setup →
            </Link>
            <Link
              href={`/dashboard/${studioId}/settings`}
              className="mt-2 ml-0 inline-block text-sm font-semibold text-emerald-700 underline underline-offset-2 hover:text-emerald-800 sm:ml-4"
            >
              Connect custom domain →
            </Link>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-11 items-center justify-center rounded-(--pm-radius-pill) bg-emerald-700 px-(--pm-space-4) text-sm font-medium text-white shadow-(--pm-shadow-rest) transition hover:bg-emerald-600"
            >
              {copied ? "Copied" : "Copy link"}
            </button>
            <Link
              href={publicPath}
              target="_blank"
              rel="noreferrer"
              className="text-center text-sm font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            >
              Preview public page
            </Link>
            <button
              type="button"
              onClick={clearQuery}
              className="text-sm text-stone-500 underline hover:text-stone-800"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
