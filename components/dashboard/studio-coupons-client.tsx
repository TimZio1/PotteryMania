"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

type StudioCoupon = {
  id: string;
  code: string;
  name: string | null;
  percentOff: number | null;
  amountOffCents: number | null;
  maxRedemptions: number | null;
  maxPerCustomer: number | null;
  minSubtotalCents: number | null;
  redeemedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
};

export function StudioCouponsClient({
  studioId,
  initialCoupons,
}: {
  studioId: string;
  initialCoupons: StudioCoupon[];
}) {
  const [coupons, setCoupons] = useState(initialCoupons);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState("");
  const [maxRedemptions, setMaxRedemptions] = useState("");
  const [maxPerCustomer, setMaxPerCustomer] = useState("");
  const [minSubtotalEur, setMinSubtotalEur] = useState("");

  async function refresh() {
    const res = await fetch(`/api/studios/${studioId}/coupons`);
    const data = (await res.json()) as { coupons?: StudioCoupon[] };
    if (res.ok && data.coupons) setCoupons(data.coupons);
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const pct = percentOff.trim() ? Number(percentOff) : null;
      const amt = amountOff.trim() ? Math.round(Number(amountOff) * 100) : null;
      const minSubtotalCents = minSubtotalEur.trim() ? Math.round(Number(minSubtotalEur) * 100) : null;
      const res = await fetch(`/api/studios/${studioId}/coupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.trim(),
          name: name.trim() || null,
          percentOff: Number.isFinite(pct ?? NaN) ? pct : null,
          amountOffCents: Number.isFinite(amt ?? NaN) ? amt : null,
          maxRedemptions: maxRedemptions.trim() ? Number(maxRedemptions) : null,
          maxPerCustomer: maxPerCustomer.trim() ? Number(maxPerCustomer) : null,
          minSubtotalCents: Number.isFinite(minSubtotalCents ?? NaN) ? minSubtotalCents : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not create coupon");
      setCode("");
      setName("");
      setPercentOff("");
      setAmountOff("");
      setMaxRedemptions("");
      setMaxPerCustomer("");
      setMinSubtotalEur("");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not create coupon");
    } finally {
      setBusy(false);
    }
  }

  async function toggleCoupon(coupon: StudioCoupon) {
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/studios/${studioId}/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !coupon.isActive }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update coupon");
      await refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not update coupon");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {err ? <p className={ui.errorText}>{err}</p> : null}
      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Create discount code</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Codes apply only to this studio checkout. Use either percentage or fixed amount.
        </p>
        <form onSubmit={createCoupon} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={ui.label}>Code</span>
            <input className={`${ui.input} mt-1`} value={code} onChange={(e) => setCode(e.target.value)} required />
          </label>
          <label className="block">
            <span className={ui.label}>Name (optional)</span>
            <input className={`${ui.input} mt-1`} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className={ui.label}>Percent off</span>
            <input
              type="number"
              min={1}
              max={100}
              className={`${ui.input} mt-1`}
              value={percentOff}
              onChange={(e) => {
                setPercentOff(e.target.value);
                if (e.target.value) setAmountOff("");
              }}
            />
          </label>
          <label className="block">
            <span className={ui.label}>Amount off (EUR)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={`${ui.input} mt-1`}
              value={amountOff}
              onChange={(e) => {
                setAmountOff(e.target.value);
                if (e.target.value) setPercentOff("");
              }}
            />
          </label>
          <label className="block">
            <span className={ui.label}>Minimum subtotal (EUR)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className={`${ui.input} mt-1`}
              value={minSubtotalEur}
              onChange={(e) => setMinSubtotalEur(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={ui.label}>Max redemptions</span>
            <input
              type="number"
              min={1}
              className={`${ui.input} mt-1`}
              value={maxRedemptions}
              onChange={(e) => setMaxRedemptions(e.target.value)}
            />
          </label>
          <label className="block">
            <span className={ui.label}>Max per customer</span>
            <input
              type="number"
              min={1}
              className={`${ui.input} mt-1`}
              value={maxPerCustomer}
              onChange={(e) => setMaxPerCustomer(e.target.value)}
            />
          </label>
          <div className="sm:col-span-2">
            <button type="submit" disabled={busy} className={ui.buttonPrimary}>
              {busy ? "Saving..." : "Create discount"}
            </button>
          </div>
        </form>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Existing codes</h2>
        {coupons.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--muted)]">No studio discount codes yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[var(--border)] bg-[var(--surface)] text-xs uppercase tracking-wide text-[var(--muted)]">
                <tr>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Discount</th>
                  <th className="px-3 py-2">Usage</th>
                  <th className="px-3 py-2">Rules</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon) => (
                  <tr key={coupon.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-3 py-2 font-mono">{coupon.code}</td>
                    <td className="px-3 py-2">
                      {coupon.percentOff != null
                        ? `${coupon.percentOff}%`
                        : `€${((coupon.amountOffCents ?? 0) / 100).toFixed(2)}`}
                    </td>
                    <td className="px-3 py-2">
                      {coupon.redeemedCount}
                      {coupon.maxRedemptions != null ? ` / ${coupon.maxRedemptions}` : ""}
                    </td>
                    <td className="px-3 py-2 text-xs text-[var(--muted)]">
                      {coupon.minSubtotalCents != null
                        ? `Min €${(coupon.minSubtotalCents / 100).toFixed(2)}`
                        : "No minimum"}
                      {coupon.maxPerCustomer != null ? ` · ${coupon.maxPerCustomer} per customer` : ""}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        className={coupon.isActive ? ui.buttonSecondary : ui.buttonPrimary}
                        onClick={() => void toggleCoupon(coupon)}
                        disabled={busy}
                      >
                        {coupon.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
