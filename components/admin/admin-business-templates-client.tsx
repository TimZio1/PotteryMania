"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { BusinessTemplateDefinition } from "@/lib/business-templates";
import { ui } from "@/lib/ui-styles";

type Overview = {
  templates: BusinessTemplateDefinition[];
  funnel30d: { eventType: string; count: number }[];
  activations30d: number;
  activeStudiosBySlug: { slug: string; studios: number }[];
};

export default function AdminBusinessTemplatesClient({ overview }: { overview: Overview }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const activeMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of overview.activeStudiosBySlug) m.set(r.slug, r.studios);
    return m;
  }, [overview.activeStudiosBySlug]);

  async function patchRow(id: string, patch: Record<string, unknown>) {
    const reason = window.prompt("Audit reason (min 8 characters):");
    if (reason === null) return;
    if (reason.trim().length < 8) {
      window.alert("Reason must be at least 8 characters.");
      return;
    }
    setPending(id);
    try {
      const res = await fetch(`/api/admin/business-templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...patch, reason: reason.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        window.alert(data.error ?? "Save failed");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="space-y-8">
      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-amber-950">Last 30 days · funnel</h2>
        <p className="mt-1 text-sm text-stone-600">
          Vendor-emitted events plus server-side activation_success. Gallery views may include refreshes.
        </p>
        <ul className="mt-4 flex flex-wrap gap-3 text-sm">
          {overview.funnel30d.map((f) => (
            <li key={f.eventType} className="rounded-full bg-stone-100 px-3 py-1 font-medium text-stone-800">
              {f.eventType}: <span className="text-amber-950">{f.count}</span>
            </li>
          ))}
          <li className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-950">
            Template switches logged: {overview.activations30d}
          </li>
        </ul>
      </section>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-[920px] w-full border-collapse text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50/90 text-xs font-semibold uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Template</th>
              <th className="px-4 py-3">Visible</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Featured</th>
              <th className="px-4 py-3">Platform pick</th>
              <th className="px-4 py-3">Default</th>
              <th className="px-4 py-3">Sort</th>
              <th className="px-4 py-3">Active studios</th>
              <th className="px-4 py-3">Save</th>
            </tr>
          </thead>
          <tbody>
            {overview.templates.map((t) => (
              <TemplateAdminRow
                key={`${t.id}-${t.updatedAtIso}`}
                t={t}
                activeStudios={activeMap.get(t.slug) ?? 0}
                busy={pending === t.id}
                onSave={(patch) => void patchRow(t.id, patch)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TemplateAdminRow({
  t,
  activeStudios,
  busy,
  onSave,
}: {
  t: BusinessTemplateDefinition;
  activeStudios: number;
  busy: boolean;
  onSave: (patch: Record<string, unknown>) => void;
}) {
  const [visible, setVisible] = useState(t.isVisible);
  const [priceEur, setPriceEur] = useState((t.priceCents / 100).toFixed(2));
  const [featured, setFeatured] = useState(t.isFeatured);
  const [platformRec, setPlatformRec] = useState(t.isPlatformRecommended);
  const [isDefault, setIsDefault] = useState(t.isDefault);
  const [sortOrder, setSortOrder] = useState(String(t.sortOrder));

  return (
    <tr className="border-b border-stone-100 align-top">
      <td className="px-4 py-3">
        <p className="font-semibold text-amber-950">{t.name}</p>
        <p className="font-mono text-xs text-stone-500">{t.slug}</p>
        <p className="mt-1 text-xs text-stone-600">{t.businessModelLabel}</p>
      </td>
      <td className="px-4 py-3">
        <input type="checkbox" checked={visible} onChange={(e) => setVisible(e.target.checked)} aria-label="Visible" />
      </td>
      <td className="px-4 py-3">
        <input
          className={ui.input + " max-w-[100px] text-sm"}
          value={priceEur}
          onChange={(e) => setPriceEur(e.target.value)}
          inputMode="decimal"
        />
        <p className="mt-1 text-xs text-stone-500">{t.currency}</p>
      </td>
      <td className="px-4 py-3">
        <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
      </td>
      <td className="px-4 py-3">
        <input type="checkbox" checked={platformRec} onChange={(e) => setPlatformRec(e.target.checked)} />
      </td>
      <td className="px-4 py-3">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
      </td>
      <td className="px-4 py-3">
        <input
          className={ui.input + " max-w-[72px] text-sm"}
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          inputMode="numeric"
        />
      </td>
      <td className="px-4 py-3 text-stone-800">{activeStudios}</td>
      <td className="px-4 py-3">
        <button
          type="button"
          disabled={busy}
          className={ui.buttonSecondary + " text-xs"}
          onClick={() => {
            const euros = parseFloat(priceEur.replace(",", "."));
            if (!Number.isFinite(euros) || euros < 0) {
              window.alert("Invalid price");
              return;
            }
            const so = parseInt(sortOrder, 10);
            if (!Number.isFinite(so)) {
              window.alert("Invalid sort order");
              return;
            }
            onSave({
              isVisible: visible,
              priceCents: Math.round(euros * 100),
              isFeatured: featured,
              isPlatformRecommended: platformRec,
              isDefault,
              sortOrder: so,
            });
          }}
        >
          {busy ? "…" : "Save"}
        </button>
      </td>
    </tr>
  );
}
