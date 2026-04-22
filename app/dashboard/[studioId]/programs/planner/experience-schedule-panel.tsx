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

const SCHEDULE_LABELS: Record<string, string> = {
  one_time: "One-off date",
  recurring_weekly: "Repeats every week",
  recurring_custom_days: "Repeats on the days you pick",
  manually_added_dates: "Specific dates only",
  flexible_window: "Every day in a date range",
};

function scheduleLabel(type: string) {
  return SCHEDULE_LABELS[type] ?? type.replace(/_/g, " ");
}

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
        setErr("Pick at least one day of the week.");
        setBusy(false);
        return;
      }
      if (scheduleType === "manually_added_dates") {
        const dates = [...new Set(manualDates.map((d) => d.trim()).filter((d) => ISO_DAY.test(d)))];
        if (dates.length === 0) {
          setErr("Add at least one date.");
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
        setErr(j.error || "We couldn’t save this schedule. Try again.");
        setBusy(false);
        return;
      }
      setOpen(false);
      await runRefresh();
    } catch {
      setErr("We couldn’t save this schedule. Try again.");
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
        setErr(j.error || "We couldn’t create the class times. Try again.");
        setBusy(false);
        return;
      }
      const created = j.created ?? 0;
      setGenMsg(
        created === 0
          ? "Nothing to add — every class time in that range already exists."
          : `Added ${created} new class ${created === 1 ? "time" : "times"}. Existing ones were left as they are.`,
      );
      await runRefresh();
    } catch {
      setErr("We couldn’t create the class times. Try again.");
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
      setErr((j as { error?: string }).error || "We couldn’t update this schedule. Try again.");
      return;
    }
    await runRefresh();
  }

  async function removeRule(ruleId: string) {
    if (!window.confirm("Delete this schedule? Class times you already created will stay; new ones won’t be made from this schedule anymore.")) return;
    setErr("");
    const r = await fetch(`/api/studios/${studioId}/experiences/${experienceId}/rules/${ruleId}`, {
      method: "DELETE",
    });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setErr((j as { error?: string }).error || "We couldn’t delete this schedule. Try again.");
      return;
    }
    await runRefresh();
  }

  return (
    <div className="mt-4 rounded-lg border border-stone-200 bg-stone-50/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">When {experienceTitle} runs</h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-sm font-medium text-amber-900 underline"
        >
          {open ? "Close" : "+ Add a schedule"}
        </button>
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        First tell us when this class runs (a one-off date, weekly, or a range). Then hit <strong>Create class times</strong>
        {" "}below to open those times up for booking.
      </p>
      {err ? <p className="mt-2 text-xs text-red-600">{err}</p> : null}

      {open ? (
        <form onSubmit={addRule} className="mt-4 space-y-3 border-t border-stone-200 pt-4">
          <label className="block text-xs font-medium text-[var(--foreground)]">
            Pattern
            <select
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
              value={scheduleType}
              onChange={(e) => setScheduleType(e.target.value as ScheduleKind)}
              disabled={busy}
            >
              <option value="one_time">One-off date</option>
              <option value="recurring_weekly">Repeats every week</option>
              <option value="recurring_custom_days">Repeats on the days I pick</option>
              <option value="manually_added_dates">Specific dates only</option>
              <option value="flexible_window">Every day in a date range</option>
            </select>
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block text-xs font-medium text-[var(--foreground)]">
              Start time
              <input
                type="time"
                className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="block text-xs font-medium text-[var(--foreground)]">
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
            <label className="block text-xs font-medium text-[var(--foreground)]">
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
              <p className="text-xs font-medium text-[var(--foreground)]">Dates</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">One session per listed day, same start/end time.</p>
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
              <label className="block text-xs font-medium text-[var(--foreground)]">
                From
                <input
                  type="date"
                  className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
                  value={recStart}
                  onChange={(e) => setRecStart(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block text-xs font-medium text-[var(--foreground)]">
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
              <p className="text-xs font-medium text-[var(--foreground)]">Weekdays</p>
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
            <p className="text-xs text-[var(--muted)]">
              Opens one time slot every single day from <strong>From</strong> to <strong>To</strong>, at the same
              start/end time. Good for open-studio sessions.
            </p>
          ) : null}
          <label className="block text-xs font-medium text-[var(--foreground)]">
            Different seat limit for this schedule? (optional)
            <input
              type="number"
              min={1}
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
              placeholder="Leave empty to use the class default"
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
            {busy ? "Saving…" : "Save schedule"}
          </button>
        </form>
      ) : null}

      <ul className="mt-4 space-y-2 border-t border-stone-200 pt-3">
        {rules.length === 0 ? (
          <li className="text-xs text-[var(--muted)]">No schedule yet. Add one above so you can create bookable class times.</li>
        ) : (
          rules.map((rule) => (
            <li
              key={rule.id}
              className="flex flex-col gap-2 rounded border border-stone-200 bg-white px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <span className="font-medium text-[var(--foreground)]">{scheduleLabel(rule.scheduleType)}</span>
                <span className="text-[var(--muted)]">
                  {" "}
                  · {rule.startTime ?? "?"}–{rule.endTime ?? "?"}
                </span>
                {rule.scheduleType === "one_time" ? (
                  <span className="block text-[var(--muted)]">{isoDateOnly(rule.recurrenceStartDate)}</span>
                ) : rule.scheduleType === "manually_added_dates" ? (
                  <span className="block text-[var(--muted)]">Dates: {rule.weekdays?.length ? rule.weekdays.join(", ") : "—"}</span>
                ) : rule.scheduleType === "flexible_window" ? (
                  <span className="block text-[var(--muted)]">
                    {isoDateOnly(rule.recurrenceStartDate)} → {isoDateOnly(rule.recurrenceEndDate) || "…"} · every day
                  </span>
                ) : (
                  <span className="block text-[var(--muted)]">
                    {isoDateOnly(rule.recurrenceStartDate)} → {isoDateOnly(rule.recurrenceEndDate) || "…"}
                    {rule.weekdays?.length ? ` · ${rule.weekdays.join(", ")}` : ""}
                  </span>
                )}
                {rule.capacityPerSlot != null ? (
                  <span className="block text-[var(--muted)]">{rule.capacityPerSlot} seats per class</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1 text-[var(--foreground)]">
                  <input
                    type="checkbox"
                    checked={rule.isActive}
                    onChange={(e) => setRuleActive(rule.id, e.target.checked)}
                  />
                  In use
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
        <p className="text-xs font-semibold text-[var(--foreground)]">Create bookable class times</p>
        <p className="text-xs text-[var(--muted)]">
          Opens the actual times people can book, based on the schedules above that are <strong>in use</strong>. We
          skip your closed days and never touch times you&apos;ve already created.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block text-xs font-medium text-[var(--foreground)]">
            From
            <input
              type="date"
              className="mt-1 w-full rounded border border-stone-300 bg-white px-2 py-2 text-sm"
              value={genFrom}
              onChange={(e) => setGenFrom(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="block text-xs font-medium text-[var(--foreground)]">
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
          {busy ? "Creating…" : "Create class times"}
        </button>
        {genMsg ? <p className="text-xs text-emerald-800">{genMsg}</p> : null}
      </form>
    </div>
  );
}
