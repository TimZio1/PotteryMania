type Point = {
  label: string;
  value: number;
};

const BAR_GRADIENT = {
  amber: "linear-gradient(180deg,#c38962_0%,#6d4530_100%)",
  rose: "linear-gradient(180deg,#e8a0a0_0%,#9a3f3f_100%)",
  emerald: "linear-gradient(180deg,#6ee7b7_0%,#15803d_100%)",
  indigo: "linear-gradient(180deg,#a5b4fc_0%,#4338ca_100%)",
} as const;

export function TimeSeriesChart({
  title,
  subtitle,
  points,
  prefix = "",
  tone = "amber",
  allowNegative = false,
}: {
  title: string;
  subtitle?: string;
  points: Point[];
  prefix?: string;
  tone?: keyof typeof BAR_GRADIENT;
  /** Symmetric scale around zero (emerald up / rose down). Ignores `tone`. */
  allowNegative?: boolean;
}) {
  const values = points.map((p) => p.value);

  if (allowNegative) {
    const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)));
    return (
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-base font-semibold text-amber-950">{title}</p>
        {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
        <div className="mt-6 flex h-52 items-stretch gap-2">
          {points.map((point, idx) => (
            <div
              key={`${point.label}-${idx}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
            >
              <span className="text-[11px] tabular-nums text-stone-600">
                {prefix}
                {point.value > 0 ? "+" : ""}
                {Math.round(point.value).toLocaleString()}
              </span>
              <div className="flex w-full flex-1 flex-col border-b-2 border-stone-400">
                <div className="flex flex-1 flex-col justify-end">
                  {point.value > 0 ? (
                    <div
                      className="w-full rounded-t-sm bg-[linear-gradient(180deg,#6ee7b7_0%,#15803d_100%)]"
                      style={{ height: `${Math.max(8, (point.value / maxAbs) * 100)}%` }}
                    />
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col justify-start">
                  {point.value < 0 ? (
                    <div
                      className="w-full rounded-b-sm bg-[linear-gradient(0deg,#e8a0a0_0%,#9a3f3f_100%)]"
                      style={{ height: `${Math.max(8, (-point.value / maxAbs) * 100)}%` }}
                    />
                  ) : null}
                </div>
              </div>
              <span className="text-[11px] text-stone-400">{point.label}</span>
            </div>
          ))}
        </div>
      </section>
    );
  }

  const max = Math.max(...values, 1);
  const barBg = BAR_GRADIENT[tone];

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-base font-semibold text-amber-950">{title}</p>
      {subtitle ? <p className="mt-1 text-sm text-stone-500">{subtitle}</p> : null}
      <div className="mt-6 flex h-48 items-end gap-2">
        {points.map((point, idx) => {
          const height = Math.max(8, Math.round((point.value / max) * 100));
          return (
            <div
              key={`${point.label}-${idx}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <span className="text-[11px] text-stone-500">
                {prefix}
                {Math.round(point.value).toLocaleString()}
              </span>
              <div className="w-full rounded-full bg-stone-100" style={{ height: `${height}%` }}>
                <div className="h-full w-full rounded-full" style={{ background: barBg }} />
              </div>
              <span className="text-[11px] text-stone-400">{point.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
