import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma, StudioStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { DataTable } from "@/components/admin/data-table";
import { ui } from "@/lib/ui-styles";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const STATUSES: { value: StudioStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "pending_review", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "suspended", label: "Suspended" },
  { value: "rejected", label: "Rejected" },
  { value: "draft", label: "Draft" },
];

type Search = { status?: string; q?: string; page?: string };

function hrefStudios(sp: { status?: string; q?: string; page?: number }) {
  const p = new URLSearchParams();
  if (sp.status && sp.status !== "all") p.set("status", sp.status);
  if (sp.q?.trim()) p.set("q", sp.q.trim());
  if (sp.page && sp.page > 1) p.set("page", String(sp.page));
  const s = p.toString();
  return s ? `/admin/studios?${s}` : "/admin/studios";
}

type Props = { searchParams?: Promise<Search> };

export default async function AdminStudiosPage({ searchParams }: Props) {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const raw = (await searchParams) ?? {};
  const statusFilter = typeof raw.status === "string" ? raw.status : "all";
  const q = typeof raw.q === "string" ? raw.q.trim() : "";
  const page = Math.max(1, parseInt(typeof raw.page === "string" ? raw.page : "1", 10) || 1);
  const limit = 30;
  const skip = (page - 1) * limit;

  const and: Prisma.StudioWhereInput[] = [];
  if (statusFilter !== "all") {
    const ok = STATUSES.some((s) => s.value === statusFilter);
    if (ok && statusFilter !== "all") {
      and.push({ status: statusFilter as StudioStatus });
    }
  }
  if (q.length > 0) {
    and.push({
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { city: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { legalBusinessName: { contains: q, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.StudioWhereInput = and.length ? { AND: and } : {};

  const [total, studios] = await Promise.all([
    prisma.studio.count({ where }),
    prisma.studio.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }],
      skip,
      take: limit,
      include: {
        owner: { select: { id: true, email: true } },
        stripeAccount: { select: { chargesEnabled: true, payoutsEnabled: true } },
        _count: { select: { products: true, experiences: true, bookings: true } },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  type Row = (typeof studios)[number];

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Directory</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Studios</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Search and open any studio record: catalog counts, Stripe Connect, activation, marketplace rank, and status
        actions live on the detail page.
      </p>

      <form method="get" className={`${ui.cardMuted} mt-8 space-y-4`}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className={ui.label} htmlFor="studios-admin-q">
              Search
            </label>
            <input
              id="studios-admin-q"
              name="q"
              type="search"
              placeholder="Name, city, email…"
              defaultValue={q}
              className={`${ui.input} mt-1.5`}
            />
          </div>
          <div>
            <label className={ui.label} htmlFor="studios-admin-status">
              Status
            </label>
            <select
              id="studios-admin-status"
              name="status"
              defaultValue={statusFilter}
              className={`${ui.input} mt-1.5`}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className={ui.buttonPrimary}>
          Apply
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-600">
        <span className="font-medium text-stone-800">{total}</span> studio{total === 1 ? "" : "s"}
        {totalPages > 1 ? (
          <span className="text-stone-500">
            {" "}
            · page {page} of {totalPages}
          </span>
        ) : null}
      </p>

      <div className="mt-4">
        <DataTable<Row>
          empty="No studios match these filters."
          rows={studios}
          columns={[
            {
              key: "name",
              header: "Studio",
              cell: (r) => (
                <Link href={`/admin/studios/${r.id}`} className="font-medium text-amber-900 hover:underline">
                  {r.displayName}
                </Link>
              ),
            },
            {
              key: "loc",
              header: "Location",
              cell: (r) => (
                <span className="text-stone-600">
                  {r.city}, {r.country}
                </span>
              ),
            },
            {
              key: "st",
              header: "Status",
              cell: (r) => <code className="text-xs text-stone-700">{r.status}</code>,
            },
            {
              key: "own",
              header: "Owner",
              cell: (r) => (
                <Link href={`/admin/users/${r.owner.id}`} className="text-amber-900 hover:underline">
                  {r.owner.email}
                </Link>
              ),
            },
            {
              key: "cat",
              header: "Catalog",
              cell: (r) => (
                <span className="text-xs text-stone-600">
                  {r._count.experiences} classes · {r._count.products} products · {r._count.bookings} bookings
                </span>
              ),
            },
            {
              key: "stripe",
              header: "Stripe",
              cell: (r) =>
                r.stripeAccount?.chargesEnabled && r.stripeAccount?.payoutsEnabled ? (
                  <span className="text-xs font-medium text-emerald-800">Ready</span>
                ) : r.stripeAccount ? (
                  <span className="text-xs text-amber-800">Incomplete</span>
                ) : (
                  <span className="text-xs text-stone-400">—</span>
                ),
            },
            {
              key: "act",
              header: "Activation",
              cell: (r) =>
                r.activationPaidAt ? (
                  <span className="text-xs text-emerald-800">Paid</span>
                ) : (
                  <span className="text-xs text-stone-500">No</span>
                ),
            },
            {
              key: "rw",
              header: "Rank",
              cell: (r) => <span className="font-mono text-xs">{r.marketplaceRankWeight}</span>,
            },
          ]}
        />
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {page > 1 ? (
            <Link
              href={hrefStudios({ status: statusFilter, q, page: page - 1 })}
              className={cn(ui.buttonSecondary, "text-sm")}
            >
              Previous
            </Link>
          ) : null}
          {page < totalPages ? (
            <Link
              href={hrefStudios({ status: statusFilter, q, page: page + 1 })}
              className={cn(ui.buttonSecondary, "text-sm")}
            >
              Next
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
