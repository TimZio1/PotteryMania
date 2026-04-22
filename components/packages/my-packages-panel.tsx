"use client";

import { useMemo } from "react";
import Link from "next/link";
import { humanPackageStatus } from "@/lib/status-labels";
import { ui } from "@/lib/ui-styles";

type PurchaseRow = {
  id: string;
  startsAt: string;
  expiresAt: string;
  creditsTotal: number;
  creditsUsed: number;
  status: "active" | "expired" | "cancelled" | "fully_used";
  package: {
    id: string;
    name: string;
    studio: { id: string; displayName: string };
    items: { id: string; quantity: number; experience: { id: string; title: string } }[];
  };
};

export function MyPackagesPanel({
  packagePurchases,
  initialMessage,
}: {
  packagePurchases: PurchaseRow[];
  initialMessage?: string;
}) {
  const byStudio = useMemo(() => {
    const groups = new Map<string, { studio: PurchaseRow["package"]["studio"]; purchases: PurchaseRow[] }>();
    for (const purchase of packagePurchases) {
      const studio = purchase.package.studio;
      const current = groups.get(studio.id) ?? { studio, purchases: [] };
      current.purchases.push(purchase);
      groups.set(studio.id, current);
    }
    return [...groups.values()];
  }, [packagePurchases]);

  return (
    <div className="space-y-6">
      {initialMessage ? <p className={ui.successText}>{initialMessage}</p> : null}
      {packagePurchases.length === 0 ? (
        <div className={`${ui.cardMuted}`}>
          <p className="font-medium text-stone-800">No packages yet</p>
          <p className="mt-2 text-sm text-stone-600">Pay once for a bundle of credits, then book classes against it — usually cheaper than paying per class.</p>
        </div>
      ) : (
        byStudio.map((group) => (
          <section key={group.studio.id} className={`${ui.card} space-y-4`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-amber-950">{group.studio.displayName}</h2>
              <Link href={`/studios/${group.studio.id}/packages`} className="text-sm font-medium text-amber-900 hover:underline">
                See this studio’s packages
              </Link>
            </div>
            <div className="space-y-3">
              {group.purchases.map((purchase) => {
                const remaining = Math.max(0, purchase.creditsTotal - purchase.creditsUsed);
                return (
                  <div key={purchase.id} className="rounded-xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-stone-900">{purchase.package.name}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          Valid {purchase.startsAt.slice(0, 10)} → {purchase.expiresAt.slice(0, 10)}
                        </p>
                      </div>
                      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-medium text-stone-700">
                        {humanPackageStatus(purchase.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-stone-700">
                      <strong>{remaining}</strong> of {purchase.creditsTotal} credits left to use
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-stone-600">
                      {purchase.package.items.map((item) => (
                        <li key={item.id}>
                          {item.experience.title}: {item.quantity} {item.quantity === 1 ? "credit" : "credits"} per booking
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
