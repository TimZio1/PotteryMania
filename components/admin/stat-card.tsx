export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-950">{value}</p>
      {hint ? <p className="mt-2 text-xs text-stone-500">{hint}</p> : null}
    </article>
  );
}
