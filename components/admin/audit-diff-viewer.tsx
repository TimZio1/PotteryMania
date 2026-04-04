import { diffAuditFields } from "@/lib/admin-audit";

type JsonObj = Record<string, unknown> | null;

export function AuditDiffViewer({
  before,
  after,
}: {
  before: JsonObj;
  after: JsonObj;
}) {
  const rows = diffAuditFields(before, after).filter((row) => row.changed);
  if (!rows.length) {
    return <p className="text-sm text-stone-500">No field-level diff available.</p>;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-stone-200">
      <table className="min-w-full text-left text-xs">
        <thead className="bg-stone-50">
          <tr>
            <th className="px-3 py-2 font-semibold text-stone-600">Field</th>
            <th className="px-3 py-2 font-semibold text-stone-600">Before</th>
            <th className="px-3 py-2 font-semibold text-stone-600">After</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 bg-white">
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="px-3 py-2 font-medium text-stone-700">{row.key}</td>
              <td className="px-3 py-2 text-stone-500">
                <code>{stringifyJson(row.before)}</code>
              </td>
              <td className="px-3 py-2 text-stone-700">
                <code>{stringifyJson(row.after)}</code>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function stringifyJson(value: unknown) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}
