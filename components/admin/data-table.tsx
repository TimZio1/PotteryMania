import type { ReactNode } from "react";

type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  rows: T[];
  empty: ReactNode;
};

export function DataTable<T>({ columns, rows, empty }: Props<T>) {
  if (!rows.length) {
    return <div className="rounded-2xl border border-stone-200 bg-white p-6 text-sm text-stone-500">{empty}</div>;
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-stone-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead className="sticky top-0 bg-stone-50/95 backdrop-blur">
          <tr className="border-b border-stone-200">
            {columns.map((column) => (
              <th key={column.key} className={`px-4 py-3 font-semibold text-stone-700 ${column.className ?? ""}`}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-stone-100 last:border-b-0">
              {columns.map((column) => (
                <td key={column.key} className={`px-4 py-3 align-top text-stone-600 ${column.className ?? ""}`}>
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
