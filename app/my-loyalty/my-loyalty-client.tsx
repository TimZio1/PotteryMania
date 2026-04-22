"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Tx = {
  id: string;
  type: string;
  points: number;
  description: string | null;
  createdAt: string;
};

type Balance = {
  id: string;
  studio: { id: string; displayName: string };
  pointsBalance: number;
  totalEarned: number;
  totalSpent: number;
  updatedAt: string;
  transactions: Tx[];
};

export function MyLoyaltyClient() {
  const [rows, setRows] = useState<Balance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyStudio, setBusyStudio] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/loyalty/my");
      const data = (await res.json()) as { error?: string; balances?: Balance[] };
      if (!res.ok) throw new Error(data.error ?? "We couldn’t load your points. Try again.");
      setRows(data.balances ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t load your points. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => {
          acc.balance += row.pointsBalance;
          acc.earned += row.totalEarned;
          acc.spent += row.totalSpent;
          return acc;
        },
        { balance: 0, earned: 0, spent: 0 },
      ),
    [rows],
  );

  async function redeem(studioId: string, availablePoints: number) {
    const points = Math.floor(availablePoints / 100) * 100;
    if (points < 500) {
      setError("You need 500 points to redeem.");
      return;
    }
    setBusyStudio(studioId);
    setError("");
    try {
      const res = await fetch("/api/loyalty/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studioId, points }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "We couldn’t redeem your points. Try again.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn’t redeem your points. Try again.");
    } finally {
      setBusyStudio(null);
    }
  }

  if (loading) return <p className="text-sm text-stone-600">Loading…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-amber-950">My points</h1>
        <p className="mt-2 text-sm text-stone-600">Points you earn per studio. Cash them in for a gift card.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Available</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{totals.balance}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Earned</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{totals.earned}</p>
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <p className="text-xs text-stone-500">Spent</p>
          <p className="mt-1 text-xl font-semibold text-stone-900">{totals.spent}</p>
        </div>
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {rows.length === 0 ? (
        <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">
          No points yet. Book a class at a participating studio to start earning.
        </p>
      ) : (
        rows.map((row) => (
          <section key={row.id} className="rounded-2xl border border-stone-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-stone-900">{row.studio.displayName}</h2>
                <p className="mt-1 text-sm text-stone-500">{row.pointsBalance} points available</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                  disabled={busyStudio === row.studio.id || row.pointsBalance < 500}
                  onClick={() => redeem(row.studio.id, row.pointsBalance)}
                >
                  {busyStudio === row.studio.id ? "Redeeming…" : "Cash in for gift card"}
                </button>
                <Link href={`/studios/${row.studio.id}`} className="rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50">
                  Open studio
                </Link>
              </div>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <p className="text-sm text-stone-600">Earned: {row.totalEarned}</p>
              <p className="text-sm text-stone-600">Spent: {row.totalSpent}</p>
            </div>
            {row.transactions.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {row.transactions.slice(0, 8).map((tx) => (
                  <li key={tx.id} className="flex items-center justify-between rounded-lg border border-stone-100 bg-stone-50 px-3 py-2 text-sm">
                    <span className="text-stone-700">{tx.description || tx.type.replace(/_/g, " ")}</span>
                    <span className={tx.points >= 0 ? "font-medium text-emerald-700" : "font-medium text-stone-700"}>
                      {tx.points >= 0 ? "+" : ""}
                      {tx.points}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        ))
      )}
    </div>
  );
}
