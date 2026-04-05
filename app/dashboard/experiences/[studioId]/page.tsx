"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ExperienceSchedulePanel, type RecurringRuleRow } from "./experience-schedule-panel";
import { StudioClosedDaysSection } from "./studio-closed-days";

type Exp = {
  id: string;
  title: string;
  status: string;
  priceCents: number;
  bookingDepositBps: number;
  bookingApprovalRequired: boolean;
  waitlistEnabled: boolean;
  recurringRules: RecurringRuleRow[];
};

function percentToBps(percentStr: string): { bps: number; error: string | null } {
  const t = percentStr.trim();
  if (t === "") return { bps: 0, error: null };
  const n = parseFloat(t.replace(",", "."));
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    return { bps: 0, error: "Deposit % must be between 0 and 100" };
  }
  return { bps: Math.min(10_000, Math.max(0, Math.round(n * 100))), error: null };
}

function bpsToPercentLabel(bps: number): string {
  if (bps <= 0) return "0";
  // Avoid float noise: bps is integer, show up to 2 decimals when needed
  const p = bps / 100;
  return Number.isInteger(p) ? String(p) : p.toFixed(2).replace(/\.?0+$/, "");
}

export default function StudioExperiencesPage() {
  const { studioId } = useParams<{ studioId: string }>();
  const [list, setList] = useState<Exp[]>([]);
  const [err, setErr] = useState("");
  const [title, setTitle] = useState("");
  const [priceEur, setPriceEur] = useState("35");

  const [createDepositPct, setCreateDepositPct] = useState("0");
  const [createApprovalRequired, setCreateApprovalRequired] = useState(false);
  const [createWaitlist, setCreateWaitlist] = useState(false);

  const [bookingEditId, setBookingEditId] = useState<string | null>(null);
  const [editDepositPct, setEditDepositPct] = useState("");
  const [editApprovalRequired, setEditApprovalRequired] = useState(false);
  const [editWaitlist, setEditWaitlist] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/studios/${studioId}/experiences`);
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Failed");
      return;
    }
    const raw = j.experiences || [];
    setList(
      raw.map((x: Record<string, unknown>) => {
        const rulesRaw = Array.isArray(x.recurringRules) ? x.recurringRules : [];
        const recurringRules: RecurringRuleRow[] = rulesRaw.map((r: Record<string, unknown>) => ({
          id: String(r.id),
          scheduleType: String(r.scheduleType),
          startTime: r.startTime != null ? String(r.startTime) : null,
          endTime: r.endTime != null ? String(r.endTime) : null,
          weekdays: Array.isArray(r.weekdays) ? r.weekdays.map((w) => String(w).toLowerCase()) : [],
          recurrenceStartDate: r.recurrenceStartDate != null ? String(r.recurrenceStartDate) : null,
          recurrenceEndDate: r.recurrenceEndDate != null ? String(r.recurrenceEndDate) : null,
          capacityPerSlot: typeof r.capacityPerSlot === "number" ? r.capacityPerSlot : null,
          isActive: r.isActive !== false,
        }));
        return {
          id: String(x.id),
          title: String(x.title),
          status: String(x.status),
          priceCents: Number(x.priceCents) || 0,
          bookingDepositBps: typeof x.bookingDepositBps === "number" ? x.bookingDepositBps : 0,
          bookingApprovalRequired: Boolean(x.bookingApprovalRequired),
          waitlistEnabled: Boolean(x.waitlistEnabled),
          recurringRules,
        };
      }),
    );
  }, [studioId]);

  useEffect(() => {
    load();
  }, [load]);

  function openBookingEdit(ex: Exp) {
    setBookingEditId(ex.id);
    setEditDepositPct(bpsToPercentLabel(ex.bookingDepositBps));
    setEditApprovalRequired(ex.bookingApprovalRequired);
    setEditWaitlist(ex.waitlistEnabled);
    setErr("");
  }

  function closeBookingEdit() {
    setBookingEditId(null);
    setEditSaving(false);
  }

  async function saveBookingEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!bookingEditId) return;
    const { bps, error: pctErr } = percentToBps(editDepositPct);
    if (pctErr) {
      setErr(pctErr);
      return;
    }
    setErr("");
    setEditSaving(true);
    const r = await fetch(`/api/studios/${studioId}/experiences/${bookingEditId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingDepositBps: bps,
        bookingApprovalRequired: editApprovalRequired,
        waitlistEnabled: editWaitlist,
      }),
    });
    const j = await r.json();
    setEditSaving(false);
    if (!r.ok) {
      setErr(j.error || "Update failed");
      return;
    }
    closeBookingEdit();
    await load();
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const priceCents = Math.round(parseFloat(priceEur) * 100);
    if (!title.trim() || !Number.isFinite(priceCents) || priceCents < 0) {
      setErr("Title and valid price required");
      return;
    }
    const { bps, error: pctErr } = percentToBps(createDepositPct);
    if (pctErr) {
      setErr(pctErr);
      return;
    }
    const r = await fetch(`/api/studios/${studioId}/experiences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        experienceType: "workshop",
        locationType: "studio_address",
        durationMinutes: 120,
        capacity: 8,
        minimumParticipants: 1,
        maximumParticipants: 8,
        priceCents,
        status: "draft",
        bookingDepositBps: bps,
        bookingApprovalRequired: createApprovalRequired,
        waitlistEnabled: createWaitlist,
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error || "Create failed");
      return;
    }
    setTitle("");
    setCreateDepositPct("0");
    setCreateApprovalRequired(false);
    setCreateWaitlist(false);
    await load();
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href={`/dashboard/studio/${studioId}`} className="text-sm text-amber-800">
        ← Studio
      </Link>
      <h1 className="mt-4 text-2xl font-semibold">Experiences &amp; schedule</h1>
      <p className="mt-2 text-sm text-stone-600">
        Create a class, add <strong>schedule rules</strong> and <strong>generate slots</strong> below, then set status
        to <strong>active</strong> and visibility <strong>public</strong> so it appears on /classes.
      </p>
      <StudioClosedDaysSection studioId={studioId} />
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <form onSubmit={create} className="mt-6 space-y-3 rounded border border-stone-200 bg-white p-4">
        <h2 className="font-medium">New experience (draft)</h2>
        <label className="block text-sm">
          Title
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Price (EUR / person)
          <input
            className="mt-1 w-full rounded border px-3 py-2"
            value={priceEur}
            onChange={(e) => setPriceEur(e.target.value)}
          />
        </label>

        <div className="border-t border-stone-100 pt-3">
          <h3 className="text-sm font-medium text-stone-800">Booking checkout</h3>
          <label className="mt-2 block text-sm">
            Deposit at checkout (% of booking total)
            <input
              type="text"
              inputMode="decimal"
              className="mt-1 w-full rounded border px-3 py-2"
              placeholder="0"
              value={createDepositPct}
              onChange={(e) => setCreateDepositPct(e.target.value)}
            />
            <span className="mt-1 block text-xs text-stone-500">
              0 = full payment online. Otherwise customers pay this % now; the rest is outside this checkout (e.g. at
              the studio).
            </span>
          </label>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={createApprovalRequired}
              onChange={(e) => setCreateApprovalRequired(e.target.checked)}
            />
            <span>
              <span className="font-medium text-stone-800">Require manual approval</span>
              <span className="block text-xs text-stone-500">
                After successful payment, the booking stays pending until you approve it in Bookings. The slot is still
                held.
              </span>
            </span>
          </label>
          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={createWaitlist}
              onChange={(e) => setCreateWaitlist(e.target.checked)}
            />
            <span>
              <span className="font-medium text-stone-800">Enable waitlist</span>
              <span className="block text-xs text-stone-500">
                When a session cannot be booked (full or not enough seats for the party), customers can join a waitlist.
                No seat is reserved.
              </span>
            </span>
          </label>
        </div>

        <button type="submit" className="w-full rounded bg-amber-800 py-2 text-white">
          Create
        </button>
      </form>
      <ul className="mt-8 space-y-2 text-sm">
        {list.map((ex) => (
          <li key={ex.id} className="border-b border-stone-100 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {ex.title}{" "}
                <span className="text-stone-500">
                  ({ex.status}) €{(ex.priceCents / 100).toFixed(2)}
                </span>
                <span className="ml-1 block text-xs text-stone-500 sm:ml-2 sm:inline">
                  Deposit {bpsToPercentLabel(ex.bookingDepositBps)}%
                  {ex.bookingApprovalRequired ? " · approval" : ""}
                  {ex.waitlistEnabled ? " · waitlist" : ""}
                </span>
              </span>
              <span className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => openBookingEdit(ex)}
                  className="text-amber-800 underline"
                >
                  Booking checkout &amp; waitlist
                </button>
                <Link href={`/classes/${ex.id}`} className="text-amber-800 underline">
                  Preview
                </Link>
              </span>
            </div>
            {bookingEditId === ex.id && (
              <form onSubmit={saveBookingEdit} className="mt-3 space-y-3 rounded border border-amber-200 bg-amber-50/40 p-3">
                <p className="text-xs font-medium text-amber-950">Edit: {ex.title}</p>
                <label className="block text-sm">
                  Deposit at checkout (% of booking total)
                  <input
                    type="text"
                    inputMode="decimal"
                    className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2"
                    value={editDepositPct}
                    onChange={(e) => setEditDepositPct(e.target.value)}
                  />
                  <span className="mt-1 block text-xs text-stone-500">
                    0 = full payment online. Max 100%.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={editApprovalRequired}
                    onChange={(e) => setEditApprovalRequired(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-stone-800">Require manual approval</span>
                    <span className="block text-xs text-stone-500">
                      Payment can complete while the booking stays pending until you approve in Bookings.
                    </span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={editWaitlist}
                    onChange={(e) => setEditWaitlist(e.target.checked)}
                  />
                  <span>
                    <span className="font-medium text-stone-800">Enable waitlist</span>
                    <span className="block text-xs text-stone-500">
                      Lets customers join a waitlist when the slot cannot accommodate their booking. Does not hold seats.
                    </span>
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={editSaving}
                    className="rounded bg-amber-800 px-3 py-1.5 text-white disabled:opacity-50"
                  >
                    {editSaving ? "Saving…" : "Save"}
                  </button>
                  <button type="button" onClick={closeBookingEdit} className="rounded border border-stone-300 px-3 py-1.5">
                    Cancel
                  </button>
                </div>
              </form>
            )}
            <ExperienceSchedulePanel
              studioId={studioId}
              experienceId={ex.id}
              experienceTitle={ex.title}
              rules={ex.recurringRules}
              onRefresh={load}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
