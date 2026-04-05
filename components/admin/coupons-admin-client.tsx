"use client";

import { useState } from "react";
import { ui } from "@/lib/ui-styles";

export type CouponRow = {
  id: string;
  code: string;
  name: string | null;
  percentOff: number | null;
  amountOffCents: number | null;
  maxRedemptions: number | null;
  redeemedCount: number;
  validFrom: string | null;
  validUntil: string | null;
  isActive: boolean;
};

export default function CouponsAdminClient({ initial }: { initial: CouponRow[] }) {
  const [rows, setRows] = useState(initial);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [percentOff, setPercentOff] = useState("");
  const [amountOff, setAmountOff] = useState("");
  const [maxRed, setMaxRed] = useState("");

  async function refresh() {
    const r = await fetch("/api/admin/coupons");
    const j = await r.json();
    if (r.ok && j.coupons) setRows(j.coupons);
  }

  async function toggleActive(id: string, isActive: boolean) {
    setBusy(true);
    setErr("");
    const r = await fetch(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    setBusy(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr(j.error || "Update failed");
      return;
    }
    await refresh();
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    const pctParsed = percentOff.trim() ? parseInt(percentOff, 10) : NaN;
    const amtParsed = amountOff.trim() ? parseInt(amountOff, 10) : NaN;
    const pct = Number.isFinite(pctParsed) ? pctParsed : null;
    const amt = Number.isFinite(amtParsed) ? amtParsed : null;
    const r = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code.trim(),
        name: name.trim() || null,
        percentOff: pct,
        amountOffCents: amt,
        maxRedemptions: maxRed.trim() ? parseInt(maxRed, 10) : null,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error || "Create failed");
      return;
    }
    setCode("");
    setName("");
    setPercentOff("");
    setAmountOff("");
    setMaxRed("");
    await refresh();
  }

  return (
    <div className="mt-8 space-y-10">
      {err ? <p className={ui.errorText}>{err}</p> : null}

      <section>
        <h2 className="text-lg font-semibold text-amber-950">Existing codes</h2>
        <p className="mt-1 text-sm text-stone-600">
          Codes are case-insensitive at checkout. Redemption counts increment when Stripe confirms payment.
        </p>
        <div className="mt-4 overflow-x-auto rounded-2xl border border-stone-200/90 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50/80 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Uses</th>
                <th className="px-4 py-3">Valid</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="border-b border-stone-100 last:border-0">
                  <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                  <td className="px-4 py-3 text-stone-700">
                    {c.percentOff != null ? `${c.percentOff}%` : null}
                    {c.amountOffCents != null ? `€${(c.amountOffCents / 100).toFixed(2)} off` : null}
                  </td>
                  <td className="px-4 py-3 text-stone-600">
                    {c.redeemedCount}
                    {c.maxRedemptions != null ? ` / ${c.maxRedemptions}` : ""}
                  </td>
                  <td className="px-4 py-3 text-xs text-stone-500">
                    {c.validUntil ? `until ${c.validUntil.slice(0, 10)}` : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => toggleActive(c.id, c.isActive)}
                      className={c.isActive ? ui.buttonSecondary : ui.buttonPrimary}
                    >
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="p-4 text-sm text-stone-500">No coupons yet.</p> : null}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-amber-950">Create coupon</h2>
        <form onSubmit={createCoupon} className="mt-4 max-w-md space-y-4">
          <div>
            <label className={ui.label} htmlFor="new-code">
              Code
            </label>
            <input
              id="new-code"
              className={`${ui.input} mt-1 font-mono`}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="WELCOME10"
              required
            />
          </div>
          <div>
            <label className={ui.label} htmlFor="new-name">
              Name (optional)
            </label>
            <input
              id="new-name"
              className={`${ui.input} mt-1`}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={ui.label} htmlFor="new-pct">
                Percent off
              </label>
              <input
                id="new-pct"
                type="number"
                min={1}
                max={100}
                className={`${ui.input} mt-1`}
                value={percentOff}
                onChange={(e) => {
                  setPercentOff(e.target.value);
                  if (e.target.value) setAmountOff("");
                }}
                placeholder="e.g. 10"
              />
            </div>
            <div>
              <label className={ui.label} htmlFor="new-amt">
                Amount off (cents)
              </label>
              <input
                id="new-amt"
                type="number"
                min={1}
                className={`${ui.input} mt-1`}
                value={amountOff}
                onChange={(e) => {
                  setAmountOff(e.target.value);
                  if (e.target.value) setPercentOff("");
                }}
                placeholder="e.g. 500 = €5"
              />
            </div>
          </div>
          <div>
            <label className={ui.label} htmlFor="new-max">
              Max redemptions (optional)
            </label>
            <input
              id="new-max"
              type="number"
              min={1}
              className={`${ui.input} mt-1`}
              value={maxRed}
              onChange={(e) => setMaxRed(e.target.value)}
            />
          </div>
          <button type="submit" disabled={busy} className={ui.buttonPrimary}>
            Create
          </button>
        </form>
      </section>
    </div>
  );
}
