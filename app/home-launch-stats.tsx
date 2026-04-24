"use client";

import { useEffect, useMemo, useState } from "react";

const LAUNCH_AT_UTC = Date.parse("2026-06-01T00:00:00Z");
const WORLDWIDE_BASE_STUDIOS = 112233;

type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function countdownParts(nowMs: number): CountdownParts {
  const remaining = Math.max(0, LAUNCH_AT_UTC - nowMs);
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

function pad2(v: number): string {
  return String(v).padStart(2, "0");
}

export function HomeLaunchStats() {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [dbCount, setDbCount] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/early-access/count", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload) => {
        if (cancelled || !payload || typeof payload.count !== "number") return;
        setDbCount(payload.count);
      })
      .catch(() => {
        // Keep previous count if network fails.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parts = useMemo(() => countdownParts(nowMs), [nowMs]);
  const launched = nowMs >= LAUNCH_AT_UTC;
  const worldwideTotal = WORLDWIDE_BASE_STUDIOS + Math.max(0, dbCount);

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-white/15 bg-white/5 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Launch countdown</p>
        {launched ? (
          <p className="mt-2 text-lg font-semibold text-white">Launched</p>
        ) : (
          <div className="mt-2 flex items-end gap-2 text-white">
            <StatBlock value={String(parts.days)} label="DAYS" />
            <span className="pb-1 text-white/50">:</span>
            <StatBlock value={pad2(parts.hours)} label="HOURS" />
            <span className="pb-1 text-white/50">:</span>
            <StatBlock value={pad2(parts.minutes)} label="MINS" />
            <span className="pb-1 text-white/50">:</span>
            <StatBlock value={pad2(parts.seconds)} label="SECS" />
          </div>
        )}
        <p className="mt-2 text-xs text-white/70">Launch: 1 June 2026</p>
      </div>

      <div className="rounded-xl border border-white/15 bg-white/5 p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">
          Studios worldwide
        </p>
        <p className="mt-2 text-2xl font-semibold text-white">{worldwideTotal.toLocaleString("en-US")}</p>
      </div>
    </div>
  );
}

function StatBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-semibold tracking-[0.14em] text-white/60">{label}</p>
    </div>
  );
}
