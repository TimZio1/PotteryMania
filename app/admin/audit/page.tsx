import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { Skeleton } from "@/components/ui/skeleton";
import { AuditLogClient } from "./audit-log-client";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Audit log",
  "/admin/audit",
  "Immutable admin action log with filters and CSV export.",
);

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminAuditPage({ searchParams }: Props) {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const sp = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const action = typeof sp.action === "string" ? sp.action.trim() : "";
  const entityType = typeof sp.entityType === "string" ? sp.entityType.trim() : "";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const from = typeof sp.from === "string" ? sp.from : "";
  const to = typeof sp.to === "string" ? sp.to : "";

  const where: Prisma.AdminAuditLogWhereInput = {};
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (entityType) where.entityType = entityType;
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) where.createdAt.lte = new Date(to);
  }
  if (q) {
    where.OR = [
      { entityId: { contains: q, mode: "insensitive" } },
      { reason: { contains: q, mode: "insensitive" } },
      { actor: { is: { email: { contains: q, mode: "insensitive" } } } },
    ];
  }

  const [total, rows] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { actor: { select: { email: true } } },
    }),
  ]);

  const initialRows = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    actorEmail: r.actor?.email ?? null,
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    reason: r.reason,
    beforeJson: r.beforeJson,
    afterJson: r.afterJson,
  }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Audit</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Admin action log</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Every sensitive mutation should appear here with before/after JSON. Filter, inspect diffs, or export CSV.
      </p>
      <div className="mt-8">
        <Suspense
          fallback={
            <div className="py-2" role="status" aria-busy="true" aria-label="Loading audit filters">
              <Skeleton className="h-10 w-full max-w-lg rounded-xl" />
            </div>
          }
        >
          <AuditLogClient initialRows={initialRows} page={page} total={total} pageSize={PAGE_SIZE} />
        </Suspense>
      </div>
    </div>
  );
}
