"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";
import { billingIntervalLabel } from "@/lib/offering-pricing";
import type { StudioClassListRow } from "@/lib/studio-classes-list";

const EXPERIENCE_TYPES: { value: string; label: string }[] = [
  { value: "one_time_event", label: "One-time event" },
  { value: "workshop", label: "Workshop" },
  { value: "masterclass", label: "Masterclass" },
  { value: "recurring_class", label: "Recurring class" },
  { value: "open_session", label: "Open session" },
  { value: "private_session", label: "Private session" },
];

const STATUS_OPTS = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "archived", label: "Archived" },
];

const VIS_OPTS = [
  { value: "public", label: "Public" },
  { value: "private", label: "Private" },
];

function fillPct(reserved: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((reserved / total) * 100));
}

export default function StudioClassesClient({
  studioId,
  classes: initialClasses,
}: {
  studioId: string;
  classes: StudioClassListRow[];
}) {
  const router = useRouter();
  const [classes, setClasses] = useState(initialClasses);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selected, setSelected] = useState<StudioClassListRow | null>(null);
  const [form, setForm] = useState({
    title: "",
    shortDescription: "",
    experienceType: "workshop",
    skillLevel: "",
    durationMinutes: 120,
    capacity: 8,
    minimumParticipants: 1,
    maximumParticipants: 8,
    priceEur: "",
    recurringPriceEur: "",
    pricingType: "one_time",
    billingInterval: "monthly",
    billingIntervalCount: 1,
    minimumCommitmentCycles: 1,
    autoRenew: true,
    trialPeriodDays: 0,
    cancellationPolicyText: "",
    gracePeriodDays: 3,
    paymentRetryMax: 3,
    failedPaymentAction: "pause",
    status: "draft",
    visibility: "public",
    bookingApprovalRequired: false,
    waitlistEnabled: false,
    bookingCutoffHours: 0,
    bufferMinutesAfter: 0,
    allowPayAtStudio: false,
    allowFullPaymentOption: false,
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setClasses(initialClasses);
  }, [initialClasses]);

  useEffect(() => {
    setSelected((cur) => {
      if (!cur) return null;
      return classes.find((c) => c.id === cur.id) ?? null;
    });
  }, [classes]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return classes.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false;
      if (typeFilter && c.experienceType !== typeFilter) return false;
      if (!qq) return true;
      return c.title.toLowerCase().includes(qq) || (c.shortDescription?.toLowerCase().includes(qq) ?? false);
    });
  }, [classes, q, statusFilter, typeFilter]);

  const openRow = useCallback((c: StudioClassListRow) => {
    setSelected(c);
    setForm({
      title: c.title,
      shortDescription: c.shortDescription ?? "",
      experienceType: c.experienceType,
      skillLevel: c.skillLevel ?? "",
      durationMinutes: c.durationMinutes,
      capacity: c.capacity,
      minimumParticipants: c.minimumParticipants,
      maximumParticipants: c.maximumParticipants,
      priceEur: (c.priceCents / 100).toFixed(2),
      recurringPriceEur: ((c.recurringPriceCents ?? 0) / 100).toFixed(2),
      pricingType: c.pricingType,
      billingInterval: c.billingInterval ?? "monthly",
      billingIntervalCount: c.billingIntervalCount ?? 1,
      minimumCommitmentCycles: c.minimumCommitmentCycles ?? 1,
      autoRenew: c.autoRenew,
      trialPeriodDays: c.trialPeriodDays ?? 0,
      cancellationPolicyText: c.cancellationPolicyText ?? "",
      gracePeriodDays: c.gracePeriodDays,
      paymentRetryMax: c.paymentRetryMax,
      failedPaymentAction: c.failedPaymentAction,
      status: c.status,
      visibility: c.visibility,
      bookingApprovalRequired: c.bookingApprovalRequired,
      waitlistEnabled: c.waitlistEnabled,
      bookingCutoffHours: c.bookingCutoffHours,
      bufferMinutesAfter: c.bufferMinutesAfter,
      allowPayAtStudio: c.allowPayAtStudio,
      allowFullPaymentOption: c.allowFullPaymentOption,
    });
    setErr(null);
  }, []);

  async function save() {
    if (!selected) return;
    const price = parseFloat(form.priceEur.replace(",", "."));
    if (!Number.isFinite(price) || price < 0) {
      setErr("Invalid price");
      return;
    }
    const priceCents = Math.round(price * 100);
    const recurringPrice = parseFloat(form.recurringPriceEur.replace(",", "."));
    const recurringPriceCents = Number.isFinite(recurringPrice) ? Math.round(recurringPrice * 100) : 0;
    if (form.maximumParticipants < form.minimumParticipants) {
      setErr("Max participants must be ≥ min");
      return;
    }
    if (form.pricingType === "recurring" && recurringPriceCents < 50) {
      setErr("Recurring price must be at least €0.50");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/studios/${studioId}/experiences/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          shortDescription: form.shortDescription.trim() || null,
          experienceType: form.experienceType,
          skillLevel: form.skillLevel.trim() || null,
          durationMinutes: form.durationMinutes,
          capacity: form.capacity,
          minimumParticipants: form.minimumParticipants,
          maximumParticipants: form.maximumParticipants,
          priceCents,
          pricingType: form.pricingType,
          recurringPriceCents: form.pricingType === "recurring" ? recurringPriceCents : null,
          billingInterval: form.pricingType === "recurring" ? form.billingInterval : null,
          billingIntervalCount: form.pricingType === "recurring" ? form.billingIntervalCount : null,
          minimumCommitmentCycles: form.pricingType === "recurring" ? form.minimumCommitmentCycles : null,
          autoRenew: form.pricingType === "recurring" ? form.autoRenew : true,
          trialPeriodDays:
            form.pricingType === "recurring" && form.trialPeriodDays > 0 ? form.trialPeriodDays : null,
          cancellationPolicyText:
            form.pricingType === "recurring" ? form.cancellationPolicyText.trim() || null : null,
          gracePeriodDays: form.pricingType === "recurring" ? form.gracePeriodDays : 3,
          paymentRetryMax: form.pricingType === "recurring" ? form.paymentRetryMax : 3,
          failedPaymentAction: form.pricingType === "recurring" ? form.failedPaymentAction : "pause",
          status: form.status,
          visibility: form.visibility,
          bookingApprovalRequired: form.bookingApprovalRequired,
          waitlistEnabled: form.waitlistEnabled,
          bookingCutoffHours: form.bookingCutoffHours,
          bufferMinutesAfter: form.bufferMinutesAfter,
          allowPayAtStudio: form.allowPayAtStudio,
          allowFullPaymentOption: form.allowFullPaymentOption,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Link href={`/dashboard/experiences/${studioId}`} className={ui.buttonPrimary}>
            Class planner &amp; schedules
          </Link>
        </div>

        <div className="sticky top-0 z-10 flex flex-col gap-3 rounded-xl border border-stone-200 bg-stone-50/95 p-4 backdrop-blur sm:flex-row sm:flex-wrap sm:items-end">
          <label className="block min-w-[180px] flex-1">
            <span className={ui.label}>Search</span>
            <input
              className={cn(ui.input, "mt-1")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Title or description…"
            />
          </label>
          <label className="block w-full min-w-[130px] sm:w-40">
            <span className={ui.label}>Status</span>
            <select className={cn(ui.input, "mt-1")} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All</option>
              {STATUS_OPTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block w-full min-w-[160px] sm:w-48">
            <span className={ui.label}>Type</span>
            <select className={cn(ui.input, "mt-1")} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All types</option>
              {EXPERIENCE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs font-semibold uppercase tracking-wide text-stone-500">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Next session</th>
                <th className="px-4 py-3">Fill</th>
                <th className="px-4 py-3">Rules</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Public</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-stone-500">
                    No classes match filters.
                  </td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isSel = selected?.id === c.id;
                  const pct = c.nextSlot ? fillPct(c.nextSlot.capacityReserved, c.nextSlot.capacityTotal) : null;
                  return (
                    <tr
                      key={c.id}
                      className={cn(
                        "cursor-pointer border-b border-stone-100 last:border-0 hover:bg-amber-50/50",
                        isSel && "bg-amber-50",
                      )}
                      onClick={() => openRow(c)}
                    >
                      <td className="px-4 py-3 font-medium text-stone-900">{c.title}</td>
                      <td className="px-4 py-3 text-stone-600">{c.status}</td>
                      <td className="px-4 py-3 text-stone-600">{c.experienceType.replace(/_/g, " ")}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {c.nextSlot ? (
                          <>
                            {c.nextSlot.slotDate}
                            <br />
                            <span className="text-xs">
                              {c.nextSlot.startTime}–{c.nextSlot.endTime}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600">
                        {pct !== null ? (
                          <>
                            {pct}%
                            <span className="block text-xs text-stone-500">
                              {c.nextSlot?.capacityReserved}/{c.nextSlot?.capacityTotal} ({c.nextSlot?.slotStatus})
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-600">{c.recurringRulesCount}</td>
                      <td className="px-4 py-3 text-stone-600">
                        {c.pricingType === "recurring" && c.recurringPriceCents != null
                          ? `€${(c.recurringPriceCents / 100).toFixed(2)}/${billingIntervalLabel(
                              c.billingInterval ?? "monthly",
                              c.billingIntervalCount ?? 1,
                            )}`
                          : `€${(c.priceCents / 100).toFixed(2)}`}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/classes/${c.id}`} className="text-amber-900 hover:underline" onClick={(e) => e.stopPropagation()}>
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <aside
          className={cn(
            ui.card,
            "lg:sticky lg:top-20 h-fit space-y-3 border-amber-200/80 shadow-md max-lg:fixed max-lg:inset-x-4 max-lg:bottom-4 max-lg:z-20 max-lg:max-h-[88vh] overflow-y-auto",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-semibold uppercase text-stone-500">Edit class</p>
            <button type="button" className={ui.buttonGhost} onClick={() => setSelected(null)}>
              Close
            </button>
          </div>
          {err ? <p className="text-sm text-rose-700">{err}</p> : null}

          <label>
            <span className={ui.label}>Title</span>
            <input className={cn(ui.input, "mt-1")} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </label>
          <label>
            <span className={ui.label}>Short description</span>
            <textarea
              className={cn(ui.input, "mt-1 min-h-[72px]")}
              value={form.shortDescription}
              onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
            />
          </label>
          <label>
            <span className={ui.label}>Type</span>
            <select
              className={cn(ui.input, "mt-1")}
              value={form.experienceType}
              onChange={(e) => setForm((f) => ({ ...f, experienceType: e.target.value }))}
            >
              {EXPERIENCE_TYPES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={ui.label}>Skill level</span>
            <input
              className={cn(ui.input, "mt-1")}
              value={form.skillLevel}
              onChange={(e) => setForm((f) => ({ ...f, skillLevel: e.target.value }))}
              placeholder="e.g. beginner"
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className={ui.label}>Duration (min)</span>
              <input
                type="number"
                min={1}
                className={cn(ui.input, "mt-1")}
                value={form.durationMinutes}
                onChange={(e) => setForm((f) => ({ ...f, durationMinutes: parseInt(e.target.value, 10) || 1 }))}
              />
            </label>
            <label>
              <span className={ui.label}>Capacity</span>
              <input
                type="number"
                min={1}
                className={cn(ui.input, "mt-1")}
                value={form.capacity}
                onChange={(e) => setForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 1 }))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className={ui.label}>Min pax</span>
              <input
                type="number"
                min={1}
                className={cn(ui.input, "mt-1")}
                value={form.minimumParticipants}
                onChange={(e) => setForm((f) => ({ ...f, minimumParticipants: parseInt(e.target.value, 10) || 1 }))}
              />
            </label>
            <label>
              <span className={ui.label}>Max pax</span>
              <input
                type="number"
                min={1}
                className={cn(ui.input, "mt-1")}
                value={form.maximumParticipants}
                onChange={(e) => setForm((f) => ({ ...f, maximumParticipants: parseInt(e.target.value, 10) || 1 }))}
              />
            </label>
          </div>
          <label>
            <span className={ui.label}>Price (EUR)</span>
            <input
              className={cn(ui.input, "mt-1")}
              inputMode="decimal"
              value={form.priceEur}
              onChange={(e) => setForm((f) => ({ ...f, priceEur: e.target.value }))}
            />
          </label>
          <div className="rounded-lg border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Monetization</p>
            <div className="mt-2 flex flex-wrap gap-4 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="class-pricing-type"
                  checked={form.pricingType === "one_time"}
                  onChange={() => setForm((f) => ({ ...f, pricingType: "one_time" }))}
                />
                One-time booking
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="class-pricing-type"
                  checked={form.pricingType === "recurring"}
                  onChange={() => setForm((f) => ({ ...f, pricingType: "recurring" }))}
                />
                Recurring membership
              </label>
            </div>
            {form.pricingType === "recurring" ? (
              <div className="mt-3 grid gap-3">
                <label>
                  <span className={ui.label}>Price per cycle (EUR)</span>
                  <input
                    className={cn(ui.input, "mt-1")}
                    inputMode="decimal"
                    value={form.recurringPriceEur}
                    onChange={(e) => setForm((f) => ({ ...f, recurringPriceEur: e.target.value }))}
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className={ui.label}>Billing frequency</span>
                    <select
                      className={cn(ui.input, "mt-1")}
                      value={form.billingInterval}
                      onChange={(e) => setForm((f) => ({ ...f, billingInterval: e.target.value }))}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="custom">Custom</option>
                    </select>
                  </label>
                  <label>
                    <span className={ui.label}>Interval count</span>
                    <input
                      type="number"
                      min={1}
                      className={cn(ui.input, "mt-1")}
                      value={form.billingIntervalCount}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, billingIntervalCount: parseInt(e.target.value, 10) || 1 }))
                      }
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className={ui.label}>Min commitment</span>
                    <input
                      type="number"
                      min={1}
                      className={cn(ui.input, "mt-1")}
                      value={form.minimumCommitmentCycles}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, minimumCommitmentCycles: parseInt(e.target.value, 10) || 1 }))
                      }
                    />
                  </label>
                  <label>
                    <span className={ui.label}>Trial days</span>
                    <input
                      type="number"
                      min={0}
                      className={cn(ui.input, "mt-1")}
                      value={form.trialPeriodDays}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, trialPeriodDays: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                      }
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label>
                    <span className={ui.label}>Grace period days</span>
                    <input
                      type="number"
                      min={0}
                      className={cn(ui.input, "mt-1")}
                      value={form.gracePeriodDays}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, gracePeriodDays: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                      }
                    />
                  </label>
                  <label>
                    <span className={ui.label}>Retry attempts</span>
                    <input
                      type="number"
                      min={0}
                      className={cn(ui.input, "mt-1")}
                      value={form.paymentRetryMax}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, paymentRetryMax: Math.max(0, parseInt(e.target.value, 10) || 0) }))
                      }
                    />
                  </label>
                </div>
                <label className="flex items-center gap-2 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    checked={form.autoRenew}
                    onChange={(e) => setForm((f) => ({ ...f, autoRenew: e.target.checked }))}
                  />
                  Auto-renew
                </label>
                <label>
                  <span className={ui.label}>Cancellation rules</span>
                  <textarea
                    className={cn(ui.input, "mt-1 min-h-[64px]")}
                    value={form.cancellationPolicyText}
                    onChange={(e) => setForm((f) => ({ ...f, cancellationPolicyText: e.target.value }))}
                    placeholder="e.g. Cancel up to 24h before renewal."
                  />
                </label>
                <label>
                  <span className={ui.label}>On failed payment</span>
                  <select
                    className={cn(ui.input, "mt-1")}
                    value={form.failedPaymentAction}
                    onChange={(e) => setForm((f) => ({ ...f, failedPaymentAction: e.target.value }))}
                  >
                    <option value="pause">Pause</option>
                    <option value="cancel">Cancel</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label>
              <span className={ui.label}>Status</span>
              <select className={cn(ui.input, "mt-1")} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}>
                {STATUS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className={ui.label}>Visibility</span>
              <select
                className={cn(ui.input, "mt-1")}
                value={form.visibility}
                onChange={(e) => setForm((f) => ({ ...f, visibility: e.target.value }))}
              >
                {VIS_OPTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.bookingApprovalRequired}
              onChange={(e) => setForm((f) => ({ ...f, bookingApprovalRequired: e.target.checked }))}
            />
            Require vendor approval
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.waitlistEnabled}
              onChange={(e) => setForm((f) => ({ ...f, waitlistEnabled: e.target.checked }))}
            />
            Waitlist when full
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.allowPayAtStudio}
              onChange={(e) => setForm((f) => ({ ...f, allowPayAtStudio: e.target.checked }))}
            />
            Allow pay at studio (no online payment)
          </label>
          <label className="flex items-center gap-2 text-sm text-stone-700">
            <input
              type="checkbox"
              checked={form.allowFullPaymentOption}
              onChange={(e) => setForm((f) => ({ ...f, allowFullPaymentOption: e.target.checked }))}
            />
            Let customers pay full price online instead of only the deposit
          </label>
          <label>
            <span className={ui.label}>Booking cutoff (hours before start)</span>
            <input
              type="number"
              min={0}
              max={168}
              className={cn(ui.input, "mt-1")}
              value={form.bookingCutoffHours}
              onChange={(e) => setForm((f) => ({ ...f, bookingCutoffHours: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
            />
            <span className="mt-1 block text-xs text-stone-500">
              0 = no cutoff. Recommended: 3h.
            </span>
          </label>
          <label>
            <span className={ui.label}>Buffer after class (minutes)</span>
            <input
              type="number"
              min={0}
              max={240}
              className={cn(ui.input, "mt-1")}
              value={form.bufferMinutesAfter}
              onChange={(e) =>
                setForm((f) => ({ ...f, bufferMinutesAfter: Math.max(0, parseInt(e.target.value, 10) || 0) }))
              }
            />
            <span className="mt-1 block text-xs text-stone-500">
              Extra cleanup/reset time kept free after each generated session.
            </span>
          </label>

          <button type="button" disabled={saving} onClick={() => void save()} className={cn(ui.buttonPrimary, "w-full")}>
            {saving ? "Saving…" : "Save changes"}
          </button>

          <p className="border-t border-stone-100 pt-3 text-xs text-stone-500">
            Images, long description, location, deposits, and slot generation live in{" "}
            <Link href={`/dashboard/experiences/${studioId}`} className="font-medium text-amber-900 underline">
              class builder
            </Link>
            .
          </p>
        </aside>
      ) : null}
    </div>
  );
}
