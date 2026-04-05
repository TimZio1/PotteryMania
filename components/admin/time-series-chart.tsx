type Point = {
  label: string;
  value: number;
};

const BAR_GRADIENT = {
  amber: "linear-gradient(180deg,#c38962_0%,#6d4530_100%)",
  rose: "linear-gradient(180deg,#e8a0a0_0%,#9a3f3f_100%)",
} as const;

export function TimeSeriesChart({
  title,
  subtitle,
  points,
  prefix = "",
  tone = "amber",
}: {
  title: string;
  subtitle?: string;
  points: Point[];
  prefix?: string;
  tone?: keyof typeof BAR_GRADIENT;
}) {
  const max = Math.max(...points.map((point) => point.value), 1);
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
