"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type ExperiencePoints = {
  id: string;
  title: string;
  loyaltyPointsEarned: number;
};

type BalanceRow = {
  userId: string;
  fullName: string | null;
  email: string;
  pointsBalance: number;
  totalEarned: number;
  totalSpent: number;
};

export default function StudioLoyaltyClient({
  studioId,
  initialEnabled,
  experiences,
  balances,
}: {
  studioId: string;
  initialEnabled: boolean;
  experiences: ExperiencePoints[];
  balances: BalanceRow[];
}) {
  const router = useRouter();
  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [pointsMap, setPointsMap] = useState<Record<string, number>>(
    Object.fromEntries(experiences.map((entry) => [entry.id, entry.loyaltyPointsEarned])),
  );
  const [selectedUserId, setSelectedUserId] = useState(balances[0]?.userId ?? "");
  const [adjustPoints, setAdjustPoints] = useState("0");
  const [adjustNote, setAdjustNote] = useState("Manual adjustment");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      balances.reduce(
        (acc, row) => {
          acc.balance += row.pointsBalance;
          acc.earned += row.totalEarned;
          acc.spent += row.totalSpent;
          return acc;
        },
        { balance: 0, earned: 0, spent: 0 },
      ),
    [balances],
  );

  async function saveConfig() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const payload = {
        isEnabled,
        pointsByExperience: pointsMap,
      };
      const res = await fetch(`/api/studios/${studioId}/loyalty`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save loyalty settings.");
      setOk("Loyalty settings saved.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function adjustBalance() {
    if (!selectedUserId) {
      setError("Select a customer to adjust.");
      return;
    }
    const points = Number.parseInt(adjustPoints, 10);
    if (!Number.isFinite(points) || points === 0) {
      setError("Adjustment points must be a non-zero integer.");
      return;
    }

    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/loyalty/adjust`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerUserId: selectedUserId,
          points,
          description: adjustNote,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not adjust balance.");
      setOk("Loyalty balance adjusted.");
      setAdjustPoints("0");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Adjustment failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-amber-950">Program configuration</h2>
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-stone-700">
          <input type="checkbox" checked={isEnabled} onChange={(e) => setIsEnabled(e.target.checked)} />
          Enable loyalty points
        </label>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {experiences.map((experience) => (
            <label key={experience.id} className="block text-sm">
              <span className={ui.label}>{experience.title}</span>
              <input
                type="number"
                min={0}
                className={`${ui.input} mt-1`}
                value={pointsMap[experience.id] ?? 0}
                onChange={(e) =>
                  setPointsMap((current) => ({
                    ...current,
                    [experience.id]: Math.max(0, Math.floor(Number.parseInt(e.target.value, 10) || 0)),
                  }))
                }
              />
            </label>
          ))}
        </div>
        <div className="mt-4">
          <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={saveConfig}>
            {busy ? "Saving..." : "Save loyalty settings"}
          </button>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-amber-950">Snapshot</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs text-stone-500">Customers</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">{balances.length}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs text-stone-500">Active balance</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">{totals.balance}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs text-stone-500">Total earned</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">{totals.earned}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs text-stone-500">Total spent</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">{totals.spent}</p>
          </div>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-amber-950">Manual adjustments</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">
            <span className={ui.label}>Customer</span>
            <select className={`${ui.input} mt-1`} value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
              <option value="">Select customer</option>
              {balances.map((row) => (
                <option key={row.userId} value={row.userId}>
                  {row.fullName || row.email} ({row.pointsBalance} pts)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Points delta</span>
            <input className={`${ui.input} mt-1`} value={adjustPoints} onChange={(e) => setAdjustPoints(e.target.value)} placeholder="+50 or -20" />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Reason</span>
            <input className={`${ui.input} mt-1`} value={adjustNote} onChange={(e) => setAdjustNote(e.target.value)} />
          </label>
        </div>
        <button type="button" className={`${ui.buttonSecondary} mt-4`} disabled={busy} onClick={adjustBalance}>
          Apply adjustment
        </button>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-amber-950">Customer balances</h2>
        {balances.length === 0 ? (
          <p className="mt-2 text-sm text-stone-600">No loyalty balances yet.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead>
                <tr className="text-stone-500">
                  <th className="pb-2 font-medium">Customer</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Balance</th>
                  <th className="pb-2 font-medium">Earned</th>
                  <th className="pb-2 font-medium">Spent</th>
                </tr>
              </thead>
              <tbody>
                {balances.map((row) => (
                  <tr key={row.userId} className="border-t border-stone-200">
                    <td className="py-2 text-stone-900">{row.fullName || "Customer"}</td>
                    <td className="py-2 text-stone-600">{row.email}</td>
                    <td className="py-2 font-medium text-stone-900">{row.pointsBalance}</td>
                    <td className="py-2 text-stone-600">{row.totalEarned}</td>
                    <td className="py-2 text-stone-600">{row.totalSpent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {error ? <p className={ui.errorText}>{error}</p> : null}
      {ok ? <p className={ui.successText}>{ok}</p> : null}
    </div>
  );
}
