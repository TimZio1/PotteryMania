"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Spinner } from "@/components/ui/spinner";
import { ui } from "@/lib/ui-styles";
import { StudioBrandImageField } from "@/components/dashboard/studio-brand-image-field";
import { studioCoverRequirementsText, studioLogoRequirementsText } from "@/lib/studio-brand-media";

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

  async function publishProfile() {
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
    if (j.activated && j.redirectTo) {
      window.location.href = j.redirectTo;
    } else if (j.free && j.redirectTo) {
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

  if (!studio) {
    return (
      <div className="flex justify-center p-8">
        <Spinner />
      </div>
    );
  }

  const activated = !!studio.activationPaidAt;
  const fields: Array<{
    key: string;
    label: string;
    type?: string;
    required?: boolean;
  }> = [
    { key: "displayName", label: "Studio display name", required: true },
    { key: "legalBusinessName", label: "Legal business name", required: true },
    { key: "vatNumber", label: "VAT / tax number", required: true },
    { key: "responsiblePersonName", label: "Responsible person", required: true },
    { key: "email", label: "Studio email", type: "email", required: true },
    { key: "phone", label: "Phone", type: "tel" },
    { key: "country", label: "Country", required: true },
    { key: "city", label: "City", required: true },
    { key: "addressLine1", label: "Address line 1", required: true },
    { key: "addressLine2", label: "Address line 2" },
    { key: "postalCode", label: "Postal code" },
    { key: "shortDescription", label: "Short description" },
    { key: "longDescription", label: "Long description" },
  ];

  return (
    <div className="mx-auto max-w-xl px-4 py-10">
      <Link href="/dashboard" className="text-sm text-amber-800">
        ← Studio control panel
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Studio workspace</h1>
      <p className="text-sm text-stone-500">
        {studio.status === "active"
          ? "Your studio is live and accepting bookings."
          : studio.status === "draft"
            ? "Your studio is in draft mode — finish setup to go live."
            : studio.status === "suspended"
              ? "Your studio is currently suspended. Contact support for details."
              : studio.status === "pending_review"
                ? "Your studio is under review. We'll notify you once it's approved."
                : "Setup in progress"}
      </p>
      {studio.rejectionReason && (
        <p className="mt-2 text-sm text-red-600">Reason: {studio.rejectionReason}</p>
      )}

      {justActivated && (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Studio activated successfully. You can now take direct reservations and product sales.
        </div>
      )}

      {/* ── Activation gate ── */}
      {!activated && (
        <div className="mt-6 rounded-2xl border-2 border-emerald-300 bg-emerald-50/60 p-5">
          <h2 className="text-lg font-semibold text-amber-950">Activate direct payments</h2>
          <p className="mt-2 text-sm text-stone-700">
            Connect Stripe first. Once payouts are enabled, direct product sales and reservations activate automatically.
          </p>
          <button
            type="button"
            onClick={payActivation}
            disabled={activating}
            className={`${ui.buttonPrimary} mt-5`}
          >
            {activating ? "Checking Stripe status…" : "Check setup & activate"}
          </button>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </div>
      )}

      <form onSubmit={save} className="mt-6 space-y-3">
        {err && !activating && <p className="text-sm text-red-600">{err}</p>}
        {fields.map((field) => (
          <label key={field.key} className="block text-sm">
            <span className="text-stone-600">{field.label}</span>
            <input
              className="mt-1 w-full rounded border px-3 py-2"
              type={field.type ?? "text"}
              required={field.required}
              value={studio[field.key] || ""}
              onChange={(e) => setStudio({ ...studio, [field.key]: e.target.value })}
            />
          </label>
        ))}
        <StudioBrandImageField
          kind="logo"
          label="Logo"
          requirements={studioLogoRequirementsText()}
          value={studio.logoUrl || ""}
          onChange={(logoUrl) => setStudio({ ...studio, logoUrl })}
        />
        <StudioBrandImageField
          kind="cover"
          label="Cover image"
          requirements={studioCoverRequirementsText()}
          value={studio.coverImageUrl || ""}
          onChange={(coverImageUrl) => setStudio({ ...studio, coverImageUrl })}
        />
        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white">
          Save
        </button>
      </form>

      <div className="mt-6 flex flex-col gap-2">
        <Link
          href={`/dashboard/studio/${studioId}/appearance`}
          className="rounded border border-stone-300 py-2 text-center text-amber-900"
        >
          Public page appearance
        </Link>
        {activated ? (
          <>
            <Link
              href={`/dashboard/experiences/${studioId}`}
              className="rounded border border-stone-300 py-2 text-center text-amber-900"
            >
              Class planner
            </Link>
            <Link
              href={`/dashboard/bookings/${studioId}`}
              className="rounded border border-stone-300 py-2 text-center text-amber-900"
            >
              Session calendar
            </Link>
            <Link
              href={`/dashboard/waitlist/${studioId}`}
              className="rounded border border-stone-300 py-2 text-center text-amber-900"
            >
              Session waitlist
            </Link>
          </>
        ) : (
          <p className="rounded-lg bg-stone-100 p-3 text-center text-sm text-stone-500">
            Connect payouts to unlock products, experiences, and reservations.
          </p>
        )}
        <button type="button" onClick={publishProfile} className="rounded border border-amber-800 py-2 text-amber-900">
          Publish studio page
        </button>
        <button type="button" onClick={stripeOnboard} className="rounded bg-stone-800 py-2 text-white">
          Connect payouts
        </button>
        <button type="button" onClick={stripeSync} className="text-sm text-stone-600 underline">
          Refresh Stripe status
        </button>
      </div>
    </div>
  );
}