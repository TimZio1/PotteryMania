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

  const clearQuery = useCallback(() => {
    const q = new URLSearchParams(searchParams.toString());
    q.delete("onboarding");
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
    <div className="mb-6 rounded-2xl border border-emerald-200/90 bg-emerald-50/90 px-4 py-4 shadow-sm sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-900">Next: get your first sale or booking</p>
          <p className="mt-1 text-sm font-medium text-emerald-950">Your public studio link is live — share it today.</p>
          <p className="mt-2 text-sm text-emerald-900/90">
            <span className="font-mono text-xs break-all sm:text-sm">{publicUrl}</span>
          </p>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-emerald-900/95">
            <li>Add one product or one class with a time slot.</li>
            <li>Send this link to your mailing list or Instagram bio.</li>
            <li>Collect payment through checkout — money hits your Stripe.</li>
          </ol>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-emerald-800 px-4 text-sm font-medium text-white transition hover:bg-emerald-900"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <Link
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className="text-center text-sm font-medium text-emerald-900 underline underline-offset-2 hover:text-emerald-950"
          >
            Preview public page
          </Link>
          <button type="button" onClick={clearQuery} className="text-sm text-emerald-800/80 underline hover:text-emerald-950">
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
