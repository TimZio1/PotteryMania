"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ui } from "@/lib/ui-styles";
import { isPromoActive } from "@/lib/promo";
import { PromoCountdown } from "@/components/promo-countdown";

export default function EditStudioPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [err, setErr] = useState("");
  const [studio, setStudio] = useState<Record<string, string> | null>(null);
  const [activating, setActivating] = useState(false);

  const justActivated = searchParams.get("activated") === "1";

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/studios");
      const j = await r.json();
      const s = j.studios?.find((x: { id: string }) => x.id === studioId);
      if (s) {
        const copy: Record<string, string> = {};
        for (const [k, v] of Object.entries(s)) {
          copy[k] = v == null ? "" : String(v);
        }
        setStudio(copy);
      }
    })();
  }, [studioId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const r = await fetch(`/api/studios/${studioId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(studio),
    });
    if (!r.ok) {
      const j = await r.json();
      setErr(j.error || "Failed");
      return;
    }
    router.refresh();
  }

  async function submitReview() {
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/submit`, { method: "POST" });
    if (!r.ok) {
      const j = await r.json();
      setErr(j.error || "Failed");
      return;
    }
    router.push("/dashboard");
  }

  async function payActivation() {
    setActivating(true);
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/activate`, { method: "POST" });
    const j = await r.json();
    if (j.free && j.redirectTo) {
      window.location.href = j.redirectTo;
    } else if (j.url) {
      window.location.href = j.url;
    } else {
      setErr(j.error || "Could not start activation");
      setActivating(false);
    }
  }

  async function stripeOnboard() {
    const r = await fetch(`/api/studios/${studioId}/stripe/onboard`, { method: "POST" });
    const j = await r.json();
    if (j.url) window.location.href = j.url;
    else setErr(j.error || "Stripe error");
  }

  async function stripeSync() {
    await fetch(`/api/studios/${studioId}/stripe/sync`);
    router.refresh();
  }

  if (!studio) return <div className="p-8">Loading…</div>;

  const activated = !!studio.activationPaidAt;

  const keys = [
    "displayName",
    "legalBusinessName",
    "vatNumber",
    "responsiblePersonName",
    "email",
    "phone",
    "country",
    "city",
    "addressLine1",
    "addressLine2",
    "postalCode",
    "shortDescription",
    "longDescription",
    "logoUrl",
    "coverImageUrl",
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Studio</h1>
      <p className="text-sm text-stone-500">Status: {studio.status}</p>
      {studio.rejectionReason && (
        <p className="mt-2 text-sm text-red-600">Reason: {studio.rejectionReason}</p>
      )}

      {justActivated && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Studio activated successfully. You can now list products and experiences.
        </div>
      )}

      {/* ── Activation gate ── */}
      {!activated && (
        <div className="mt-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-5">
          {isPromoActive() ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-emerald-900">Activate your studio — free during launch</h2>
              </div>
              <p className="mt-2 text-sm text-stone-700">
                We&apos;re waiving the activation fee for all studios joining during our launch period.
                List products, schedule classes, and start selling — completely free.
              </p>
              <PromoCountdown className="mt-3" />
              <button
                type="button"
                onClick={payActivation}
                disabled={activating}
                className={`${ui.buttonPrimary} mt-5`}
              >
                {activating ? "Activating…" : "Activate free"}
              </button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-amber-950">Activate your studio — €5 one-time fee</h2>
              <p className="mt-2 text-sm text-stone-700">
                A one-time, non-refundable activation fee is required before you can list products or
                experiences on PotteryMania.
              </p>
              <ul className="mt-3 list-disc pl-5 text-sm text-stone-600">
                <li>One-time — never charged again</li>
                <li>Non-refundable</li>
                <li>Securely processed via Stripe</li>
              </ul>
              <button
                type="button"
                onClick={payActivation}
                disabled={activating}
                className={`${ui.buttonPrimary} mt-5`}
              >
                {activating ? "Redirecting to Stripe…" : "Pay €5 & activate"}
              </button>
            </>
          )}
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      )}

      <form onSubmit={save} className="mt-6 space-y-3">
        {err && !activating && <p className="text-sm text-red-600">{err}</p>}
        {keys.map((k) => (
          <label key={k} className="block text-sm">
            <span className="text-stone-600">{k}</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              value={studio[k] || ""}
              onChange={(e) => setStudio({ ...studio, [k]: e.target.value })}
            />
          </label>
        ))}
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white">
          Save
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        {activated ? (
          <>
            <Link
              href={`/dashboard/experiences/${studioId}`}
              className="rounded border border-stone-300 py-2 text-center text-amber-900"
            >
              Classes &amp; experiences
            </Link>
            <Link
              href={`/dashboard/bookings/${studioId}`}
              className="rounded border border-stone-300 py-2 text-center text-amber-900"
            >
              Bookings
            </Link>
            <Link
              href={`/dashboard/waitlist/${studioId}`}
              className="rounded border border-stone-300 py-2 text-center text-amber-900"
            >
              Class waitlist
            </Link>
          </>
        ) : (
          <p className="rounded-lg bg-stone-100 p-3 text-center text-sm text-stone-500">
            Pay the activation fee to unlock products, experiences, and bookings.
          </p>
        )}
        <button type="button" onClick={submitReview} className="rounded border border-amber-800 py-2 text-amber-900">
          Submit for review
        </button>
        <button type="button" onClick={stripeOnboard} className="rounded bg-stone-800 py-2 text-white">
          Connect Stripe
        </button>
        <button type="button" onClick={stripeSync} className="text-sm text-stone-600 underline">
          Refresh Stripe status
        </button>
      </div>
    </div>
  );
}