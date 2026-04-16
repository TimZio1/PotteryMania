"use client";

import { useCallback, useMemo, useState } from "react";

const WEEKDAYS = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
  { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" },
] as const;

export type RecurringRuleRow = {
  id: string;
  scheduleType: string;
  startTime: string | null;
  endTime: string | null;
  weekdays: string[];
  recurrenceStartDate: string | null;
  recurrenceEndDate: string | null;
  capacityPerSlot: number | null;
  isActive: boolean;
};

type Props = {
  studioId: string;
  experienceId: string;
  experienceTitle: string;
  rules: RecurringRuleRow[];
  onRefresh: () => Promise<void>;
};

function isoDateOnly(d: string | null): string {
  if (!d) return "";
  return d.slice(0, 10);
}

function defaultGenerateRange() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 56);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

type ScheduleKind =
  | "one_time"
  | "recurring_weekly"
  | "recurring_custom_days"
  | "manually_added_dates"
  | "flexible_window";

export function ExperienceSchedulePanel({ studioId, experienceId, experienceTitle, rules, onRefresh }: Props) {
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const genDefaults = useMemo(() => defaultGenerateRange(), []);
  const [genFrom, setGenFrom] = useState(genDefaults.from);
  const [genTo, setGenTo] = useState(genDefaults.to);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const [scheduleType, setScheduleType] = useState<ScheduleKind>("recurring_weekly");
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("12:00");
  const [oneDate, setOneDate] = useState(genDefaults.from);
  const [recStart, setRecStart] = useState(genDefaults.from);
  const [recEnd, setRecEnd] = useState(genDefaults.to);
  const [selectedDays, setSelectedDays] = useState<string[]>(["sat"]);
  const [manualDates, setManualDates] = useState<string[]>([genDefaults.from]);
  const [capOverride, setCapOverride] = useState("");

  const toggleDay = useCallback((key: string) => {
    setSelectedDays((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }, []);

  const runRefresh = useCallback(async () => {
    setErr("");
    await onRefresh();
  }, [onRefresh]);

  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      if (
        (scheduleType === "recurring_weekly" || scheduleType === "recurring_custom_days") &&
        selectedDays.length === 0
      ) {
        setErr("Select at least one weekday for recurring rules.");
        setBusy(false);
        return;
      }
      if (scheduleType === "manually_added_dates") {
        const dates = [...new Set(manualDates.map((d) => d.trim()).filter((d) => ISO_DAY.test(d)))];
        if (dates.length === 0) {
          setErr("Add at least one date (YYYY-MM-DD).");
          setBusy(false);
          return;
        }
      }
      const capacityPerSlot =
        capOverride.trim() === "" ? undefined : Math.max(1, parseInt(capOverride, 10) || 0) || undefined;
      const body: Record<string, unknown> = {
        scheduleType,
        startTime,
        endTime,
        isActive: true,
      };
      if (capacityPerSlot) body.capacityPerSlot = capacityPerSlot;
      if (scheduleType === "one_time") {
        body.weekdays = [];
        body.recurrenceStartDate = oneDate;
      } else if (scheduleType === "manually_added_dates") {
        const dates = [...new Set(manualDates.map((d) => d.trim()).filter((d) => ISO_DAY.test(d)))];
        body.dates = dates;
      } else if (scheduleType === "flexible_window") {
        body.weekdays = [];
        body.recurrenceStartDate = recStart;
        body.recurrenceEndDate = recEnd;
      } else {
        body.weekdays = selectedDays;
        body.recurrenceStartDate = recStart;
        body.recurrenceEndDate = recEnd;
      }
      const r = await fetch(`/api/studios/${studioId}/experiences/${experienceId}/rules`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Could not save rule");
        setBusy(false);
        return;
      }
      setOpen(false);
      await runRefresh();
    } catch {
      setErr("Request failed");
    }
    setBusy(false);
  }

  async function generateSlots(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setGenMsg(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/studios/${studioId}/experiences/${experienceId}/slots/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: new Date(genFrom + "T12:00:00.000Z").toISOString(),
          to: new Date(genTo + "T12:00:00.000Z").toISOString(),
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setErr(j.error || "Generate failed");
        setBusy(false);
        return;
      }
      setGenMsg(`Created ${j.created ?? 0} new open slots (existing slots were left unchanged).`);
      await runRefresh();
    } catch {
      setErr("Request failed");
    }
    setBusy(false);
  }

  async function setRuleActive(ruleId: string, isActive: boolean) {
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/experiences/${experienceId}/rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive }),
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error || "Update failed");
      return;
    }
    await runRefresh();
  }

  async function removeRule(ruleId: string) {
    if (!window.confirm("Delete this schedule rule? Existing slots stay; new generates won’t use this rule.")) return;
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/experiences/${experienceId}/rules/${ruleId}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error || "Delete failed");
      return;
    }
    await runRefresh();
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-800">Schedule &amp; slots — {experienceTitle}</h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-amber-900 underline"
        >
          {open ? "Close" : "Add rule"}
        </button>
      </div>
      <p className="mt-1 text-xs text-stone-600">
        Rules describe when this class can run. Then generate booking slots for a date range. Studio-wide closed days
        are managed above (whole studio).
      </p>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}

      {open ? (
        <form onSubmit={addRule} className="mt-4 space-y-3 border-t border-stone-200 pt-4">
          <label className="block text-xs font-medium text-stone-700">
            Pattern
            <select
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleKind)}
              disabled={busy}
            >
              <option value="one_time">One-off date</option>
              <option value="recurring_weekly">Recurring (weekly pattern)</option>
              <option value="recurring_custom_days">Recurring (pick weekdays)</option>
              <option value="manually_added_dates">Specific dates only</option>
              <option value="flexible_window">Every day in a date range</option>
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-stone-700">
              Start time
              <input
                type="time"
                className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="block text-xs font-medium text-stone-700">
              End time
              <input
                type="time"
                className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={busy}
              />
            </label>
          </div>
          {scheduleType === "one_time" ? (
            <label className="block text-xs font-medium text-stone-700">
              Date
              <input
                type="date"
                className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                value={oneDate}
                onChange={(e) => setOneDate(e.target.value)}
                disabled={busy}
              />
            </label>
          ) : scheduleType === "manually_added_dates" ? (
            <div>
              <p className="text-xs font-medium text-stone-700">Dates</p>
              <p className="mt-0.5 text-xs text-stone-500">One session per listed day, same start/end time.</p>
              <ul className="mt-2 space-y-2">
                {manualDates.map((md, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2">
                    <input
                      type="date"
                      className="rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                      value={md}
                      onChange={(e) => {
                        const v = e.target.value;
                        setManualDates((prev) => prev.map((x, j) => (j === i ? v : x)));
                      }}
                      disabled={busy}
                    />
                    {manualDates.length > 1 ? (
                      <button
                        type="button"
                        className="text-xs text-red-700 underline"
                        disabled={busy}
                        onClick={() => setManualDates((prev) => prev.filter((_, j) => j !== i))}
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={busy}
                className="mt-2 text-xs font-medium text-amber-900 underline"
                onClick={() => setManualDates((prev) => [...prev, ""])}
              >
                + Add date
              </button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-stone-700">
                From
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                  value={recStart}
                  onChange={(e) => setRecStart(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block text-xs font-medium text-stone-700">
                To
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                  value={recEnd}
                  onChange={(e) => setRecEnd(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
          )}
          {scheduleType === "recurring_weekly" || scheduleType === "recurring_custom_days" ? (
            <div>
              <p className="text-xs font-medium text-stone-700">Weekdays</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEEKDAYS.map(({ key, label }) => (
                  <label key={key} className="flex cursor-pointer items-center gap-1 text-xs">
                    <input
                      type="checkbox"
                      checked={selectedDays.includes(key)}
                      onChange={() => toggleDay(key)}
                      disabled={busy}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          {scheduleType === "flexible_window" ? (
            <p className="text-xs text-stone-600">
              Creates one slot on <strong>every calendar day</strong> from &quot;From&quot; through &quot;To&quot;
              (inclusive), at the times above — useful for open-studio windows.
            </p>
          ) : null}
          <label className="block text-xs font-medium text-stone-700">
            Capacity override (optional)
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
              placeholder="Use class default if empty"
              value={capOverride}
              onChange={(e) => setCapOverride(e.target.value)}
              disabled={busy}
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="rounded bg-amber-800 px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save rule"}
          </button>
        </form>
      ) : null}

      <ul className="mt-4 space-y-2 border-t border-stone-200 pt-3">
        {rules.length === 0 ? (
          <li className="text-xs text-stone-500">No rules yet — add one to generate slots.</li>
        ) : (
          rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-col gap-2 rounded border border-stone-200 bg-white px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-medium text-stone-800">{rule.scheduleType.replace(/_/g, " ")}</span>
                <span className="text-stone-600">
                  {" "}
                  · {rule.startTime ?? "?"}–{rule.endTime ?? "?"}
                </span>
                {rule.scheduleType === "one_time" ? (
                  <span className="block text-stone-500">{isoDateOnly(rule.recurrenceStartDate)}</span>
                ) : rule.scheduleType === "manually_added_dates" ? (
                  <span className="block text-stone-500">Dates: {rule.weekdays?.length ? rule.weekdays.join(", ") : "—"}</span>
                ) : rule.scheduleType === "flexible_window" ? (
                  <span className="block text-stone-500">
                    {isoDateOnly(rule.recurrenceStartDate)} → {isoDateOnly(rule.recurrenceEndDate) || "…"} · every day
                  </span>
                ) : (
                  <span className="block text-stone-500">
                    {isoDateOnly(rule.recurrenceStartDate)} → {isoDateOnly(rule.recurrenceEndDate) || "…"}
                    {rule.weekdays?.length ? ` · ${rule.weekdays.join(", ")}` : ""}
                  </span>
                )}
                {rule.capacityPerSlot != null ? (
                  <span className="block text-stone-500">Cap {rule.capacityPerSlot}/session</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-stone-700">
                  <input
                    type="checkbox"
                    checked={rule.isActive}
                    onChange={(e) => setRuleActive(rule.id, e.target.checked)}
                  />
                  Active
                </label>
                <button type="button" className="text-red-700 underline" onClick={() => removeRule(rule.id)}>
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={generateSlots} className="mt-4 space-y-2 border-t border-stone-200 pt-4">
        <p className="text-xs font-semibold text-stone-800">Generate open slots</p>
        <p className="text-xs text-stone-600">
          Uses <strong>active</strong> rules only. Does not remove existing slots; adds missing ones. Respects studio
          closed days.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-stone-700">
            From
            <input
              type="date"
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
              value={genFrom}
              onChange={(e) => setGenFrom(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block text-xs font-medium text-stone-700">
            To
            <input
              type="date"
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
              value={genTo}
              onChange={(e) => setGenTo(e.target.value)}
              disabled={busy}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded border border-amber-900 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-950 disabled:opacity-50"
        >
          {busy ? "Working…" : "Generate slots"}
        </button>
        {genMsg ? <p className="text-xs text-emerald-800">{genMsg}</p> : null}
      </form>
    </div>
  );
}
