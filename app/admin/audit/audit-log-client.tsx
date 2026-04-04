"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuditDiffViewer } from "@/components/admin/audit-diff-viewer";
import { DataTable } from "@/components/admin/data-table";
import { FilterBar } from "@/components/admin/filter-bar";
import { ui } from "@/lib/ui-styles";

export type AuditRow = {
  id: string;
  createdAt: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  reason: string | null;
  beforeJson: unknown;
  afterJson: unknown;
};

type Props = {
  initialRows: AuditRow[];
  page: number;
  total: number;
  pageSize: number;
};

export function AuditLogClient({ initialRows, page, total, pageSize }: Props) {
  const router = useRouter();
  const sp = useSearchParams();
  const [expanded, setExpanded] = useState<string | null>(null);

  const queryBase = useMemo(() => {
    const p = new URLSearchParams(sp.toString());
    return p.toString();
  }, [sp]);

  function navigateWith(partial: Record<string, string>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(partial)) {
      if (v === "") p.delete(k);
      else p.set(k, v);
    }
    if (!partial.page) p.set("page", "1");
    router.push(`/admin/audit?${p.toString()}`);
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <FilterBar>
        <form
          className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            navigateWith({
              q: String(fd.get("q") ?? ""),
              action: String(fd.get("action") ?? ""),
              entityType: String(fd.get("entityType") ?? ""),
              from: String(fd.get("from") ?? ""),
              to: String(fd.get("to") ?? ""),
            });
          }}
        >
          <label className="min-w-[160px] flex-1">
            <span className={ui.label}>Search</span>
            <input name="q" className={`${ui.input} mt-1`} defaultValue={sp.get("q") ?? ""} placeholder="Email, entity id…" />
          </label>
          <label className="min-w-[120px]">
            <span className={ui.label}>Action</span>
            <input name="action" className={`${ui.input} mt-1`} defaultValue={sp.get("action") ?? ""} />
          </label>
          <label className="min-w-[120px]">
            <span className={ui.label}>Entity</span>
            <input name="entityType" className={`${ui.input} mt-1`} defaultValue={sp.get("entityType") ?? ""} />
          </label>
          <label className="min-w-[130px]">
            <span className={ui.label}>From</span>
            <input name="from" type="date" className={`${ui.input} mt-1`} defaultValue={sp.get("from") ?? ""} />
          </label>
          <label className="min-w-[130px]">
            <span className={ui.label}>To</span>
            <input name="to" type="date" className={`${ui.input} mt-1`} defaultValue={sp.get("to") ?? ""} />
          </label>
          <button type="submit" className={`${ui.buttonPrimary} mt-6 lg:mt-0`}>
            Apply
          </button>
        </form>
      </FilterBar>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`/api/admin/audit?format=csv&${queryBase}`}
          className={`${ui.buttonSecondary} inline-flex px-4`}
        >
          Download CSV
        </a>
        <p className="text-sm text-stone-500">
          Page {page} of {totalPages} · {total} rows
        </p>
      </div>

      <DataTable<AuditRow>
        rows={initialRows}
        empty="No audit entries match these filters."
        columns={[
          {
            key: "when",
            header: "When",
            cell: (r) => <span className="whitespace-nowrap text-xs text-stone-500">{r.createdAt.slice(0, 19)}Z</span>,
          },
          { key: "actor", header: "Actor", cell: (r) => r.actorEmail ?? "—" },
          { key: "action", header: "Action", cell: (r) => <span className="font-medium text-stone-800">{r.action}</span> },
          {
            key: "target",
            header: "Target",
            cell: (r) => (
              <span className="text-xs">
                {r.entityType}
                {r.entityId ? (
                  <>
                    <br />
                    <code className="text-[11px] text-stone-500">{r.entityId}</code>
                  </>
                ) : null}
              </span>
            ),
          },
          {
            key: "diff",
            header: "",
            className: "w-28",
            cell: (r) => (
              <button
                type="button"
                className="text-xs font-medium text-amber-900 underline-offset-2 hover:underline"
                onClick={() => setExpanded((c) => (c === r.id ? null : r.id))}
              >
                {expanded === r.id ? "Hide diff" : "View diff"}
              </button>
            ),
          },
        ]}
      />

      {expanded ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
          {(() => {
            const row = initialRows.find((x) => x.id === expanded);
            if (!row) return null;
            return (
              <div className="space-y-3">
                {row.reason ? <p className="text-sm text-stone-600">Reason: {row.reason}</p> : null}
                <AuditDiffViewer
                  before={row.beforeJson as Record<string, unknown> | null}
                  after={row.afterJson as Record<string, unknown> | null}
                />
              </div>
            );
          })()}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={page <= 1}
          className={ui.buttonSecondary}
          onClick={() => navigateWith({ page: String(page - 1) })}
        >
          Previous
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          className={ui.buttonSecondary}
          onClick={() => navigateWith({ page: String(page + 1) })}
        >
          Next
        </button>
      </div>
    </div>
  );
}
