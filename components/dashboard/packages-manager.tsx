"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";

type ExperienceOption = {
  id: string;
  title: string;
};

type ClassPackageItem = {
  id: string;
  experienceId: string;
  quantity: number;
  experience: ExperienceOption;
};

type ClassPackageRow = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  priceCents: number;
  validityDays: number;
  generalItemLimit: number | null;
  maxSetsForSale: number | null;
  soldCount: number;
  isActive: boolean;
  isVisible: boolean;
  autoRefundOnCancel: boolean;
  items: ClassPackageItem[];
  _count?: { purchases: number };
};

type PackageFormState = {
  name: string;
  description: string;
  imageUrl: string;
  priceEur: string;
  validityDays: number;
  generalItemLimit: string;
  maxSetsForSale: string;
  isActive: boolean;
  isVisible: boolean;
  autoRefundOnCancel: boolean;
  experienceIds: string[];
  experienceCredits: Record<string, number>;
};

function emptyForm(): PackageFormState {
  return {
    name: "",
    description: "",
    imageUrl: "",
    priceEur: "0.00",
    validityDays: 30,
    generalItemLimit: "",
    maxSetsForSale: "",
    isActive: true,
    isVisible: true,
    autoRefundOnCancel: false,
    experienceIds: [],
    experienceCredits: {},
  };
}

function formFromPackage(pkg: ClassPackageRow): PackageFormState {
  const experienceCredits: Record<string, number> = {};
  const experienceIds = pkg.items.map((item) => {
    experienceCredits[item.experienceId] = item.quantity;
    return item.experienceId;
  });
  return {
    name: pkg.name,
    description: pkg.description ?? "",
    imageUrl: pkg.imageUrl ?? "",
    priceEur: (pkg.priceCents / 100).toFixed(2),
    validityDays: pkg.validityDays,
    generalItemLimit: pkg.generalItemLimit != null ? String(pkg.generalItemLimit) : "",
    maxSetsForSale: pkg.maxSetsForSale != null ? String(pkg.maxSetsForSale) : "",
    isActive: pkg.isActive,
    isVisible: pkg.isVisible,
    autoRefundOnCancel: pkg.autoRefundOnCancel,
    experienceIds,
    experienceCredits,
  };
}

function packageTotalCredits(pkg: Pick<ClassPackageRow, "items" | "generalItemLimit">): number {
  if (pkg.generalItemLimit != null) return pkg.generalItemLimit;
  return pkg.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
}

export default function PackagesManager({
  studioId,
  experiences,
  initialPackages,
}: {
  studioId: string;
  experiences: ExperienceOption[];
  initialPackages: ClassPackageRow[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialPackages);
  const [selectedId, setSelectedId] = useState<string | null>(initialPackages[0]?.id ?? null);
  const [form, setForm] = useState<PackageFormState>(() =>
    initialPackages[0] ? formFromPackage(initialPackages[0]) : emptyForm(),
  );
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  function openNew() {
    setSelectedId(null);
    setForm(emptyForm());
    setErr(null);
    setMsg(null);
  }

  function openExisting(pkg: ClassPackageRow) {
    setSelectedId(pkg.id);
    setForm(formFromPackage(pkg));
    setErr(null);
    setMsg(null);
  }

  function toggleExperience(experienceId: string) {
    setForm((current) => {
      const included = current.experienceIds.includes(experienceId);
      const nextIds = included
        ? current.experienceIds.filter((id) => id !== experienceId)
        : [...current.experienceIds, experienceId];
      const nextCredits = { ...current.experienceCredits };
      if (!included && !nextCredits[experienceId]) nextCredits[experienceId] = 1;
      return { ...current, experienceIds: nextIds, experienceCredits: nextCredits };
    });
  }

  function setExperienceCredits(experienceId: string, next: number) {
    setForm((current) => ({
      ...current,
      experienceCredits: {
        ...current.experienceCredits,
        [experienceId]: Math.max(1, Math.floor(next || 1)),
      },
    }));
  }

  async function save() {
    const price = Number.parseFloat(form.priceEur.replace(",", "."));
    if (!form.name.trim()) {
      setErr("Package name is required.");
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setErr("Enter a valid package price.");
      return;
    }
    if (form.experienceIds.length === 0) {
      setErr("Select at least one class.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      imageUrl: form.imageUrl.trim() || null,
      priceCents: Math.round(price * 100),
      validityDays: Math.max(1, Math.floor(form.validityDays || 1)),
      generalItemLimit: form.generalItemLimit.trim() ? Math.max(1, Math.floor(Number(form.generalItemLimit))) : null,
      maxSetsForSale: form.maxSetsForSale.trim() ? Math.max(1, Math.floor(Number(form.maxSetsForSale))) : null,
      isActive: form.isActive,
      isVisible: form.isVisible,
      autoRefundOnCancel: form.autoRefundOnCancel,
      experienceIds: form.experienceIds,
      experienceCredits: Object.fromEntries(
        form.experienceIds.map((experienceId) => [experienceId, Math.max(1, Math.floor(form.experienceCredits[experienceId] ?? 1))]),
      ),
    };

    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      if (!selectedId) {
        const res = await fetch(`/api/studios/${studioId}/packages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as { error?: string; package?: ClassPackageRow };
        if (!res.ok || !data.package) throw new Error(data.error ?? "Could not create package.");
        const next = [data.package, ...items];
        setItems(next);
        setSelectedId(data.package.id);
        setForm(formFromPackage(data.package));
        setMsg("Package created.");
        router.refresh();
        return;
      }

      const res = await fetch(`/api/studios/${studioId}/packages/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; package?: ClassPackageRow };
      if (!res.ok || !data.package) throw new Error(data.error ?? "Could not update package.");

      setItems((current) => current.map((item) => (item.id === selectedId ? data.package! : item)));
      setForm(formFromPackage(data.package));
      setMsg("Package updated.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSelected() {
    if (!selectedId || !selected) return;
    if (!confirm(`Delete package "${selected.name}"?`)) return;
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/packages/${selectedId}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not delete package.");
      const next = items.filter((item) => item.id !== selectedId);
      setItems(next);
      if (next[0]) {
        setSelectedId(next[0].id);
        setForm(formFromPackage(next[0]));
      } else {
        openNew();
      }
      setMsg("Package deleted.");
      router.refresh();
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <section className={`${ui.card} space-y-4`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={ui.overline}>Catalog</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-950">Packages</h2>
          </div>
          <button type="button" className={ui.buttonPrimary} onClick={openNew}>
            + New
          </button>
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600">
            No class packages yet.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((pkg) => {
              const active = pkg.id === selectedId;
              return (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => openExisting(pkg)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    active ? "border-amber-300 bg-amber-50" : "border-stone-200 bg-white hover:border-amber-200 hover:bg-stone-50"
                  }`}
                >
                  <p className="font-medium text-stone-900">{pkg.name}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {pkg.isActive ? "Active" : "Inactive"} · €{(pkg.priceCents / 100).toFixed(2)} · {packageTotalCredits(pkg)} credits
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      <section className={`${ui.card} space-y-5`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className={ui.overline}>{selected ? "Edit" : "Create"}</p>
            <h2 className="mt-1 text-lg font-semibold text-amber-950">{selected ? selected.name : "New class package"}</h2>
          </div>
          {selected ? (
            <button type="button" className={ui.buttonGhost} onClick={removeSelected} disabled={busy}>
              Delete
            </button>
          ) : null}
        </div>

        {err ? <p className={ui.errorText}>{err}</p> : null}
        {msg ? <p className={ui.successText}>{msg}</p> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm sm:col-span-2">
            <span className={ui.label}>Package name</span>
            <input className={`${ui.input} mt-1`} value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className={ui.label}>Description</span>
            <textarea className={`${ui.input} mt-1 min-h-24`} value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Price (EUR)</span>
            <input className={`${ui.input} mt-1`} value={form.priceEur} onChange={(e) => setForm((c) => ({ ...c, priceEur: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Validity days</span>
            <input
              type="number"
              min={1}
              className={`${ui.input} mt-1`}
              value={form.validityDays}
              onChange={(e) => setForm((c) => ({ ...c, validityDays: Math.max(1, Number(e.target.value) || 1) }))}
            />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Total credits (optional)</span>
            <input className={`${ui.input} mt-1`} value={form.generalItemLimit} onChange={(e) => setForm((c) => ({ ...c, generalItemLimit: e.target.value }))} />
          </label>
          <label className="block text-sm">
            <span className={ui.label}>Max sets for sale (optional)</span>
            <input className={`${ui.input} mt-1`} value={form.maxSetsForSale} onChange={(e) => setForm((c) => ({ ...c, maxSetsForSale: e.target.value }))} />
          </label>
        </div>

        <div className="space-y-3">
          <p className={ui.label}>Included classes and credits per booking</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {experiences.map((experience) => {
              const checked = form.experienceIds.includes(experience.id);
              return (
                <div key={experience.id} className="rounded-xl border border-stone-200 bg-white p-3">
                  <label className="inline-flex items-center gap-2 text-sm text-stone-700">
                    <input type="checkbox" checked={checked} onChange={() => toggleExperience(experience.id)} />
                    <span>{experience.title}</span>
                  </label>
                  {checked ? (
                    <label className="mt-2 block text-xs text-stone-500">
                      Credits used
                      <input
                        type="number"
                        min={1}
                        className={`${ui.input} mt-1`}
                        value={form.experienceCredits[experience.id] ?? 1}
                        onChange={(e) => setExperienceCredits(experience.id, Number(e.target.value))}
                      />
                    </label>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-stone-700 sm:grid-cols-3">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm((c) => ({ ...c, isActive: e.target.checked }))} />
            Active
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={form.isVisible} onChange={(e) => setForm((c) => ({ ...c, isVisible: e.target.checked }))} />
            Visible publicly
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.autoRefundOnCancel}
              onChange={(e) => setForm((c) => ({ ...c, autoRefundOnCancel: e.target.checked }))}
            />
            Auto-refund credit on cancel
          </label>
        </div>

        <button type="button" className={ui.buttonPrimary} disabled={busy} onClick={save}>
          {busy ? "Saving..." : selected ? "Save package" : "Create package"}
        </button>
      </section>
    </div>
  );
}
