import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { DataTable } from "@/components/admin/data-table";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;
const ROLES: UserRole[] = ["customer", "vendor", "admin", "hyper_admin"];

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminUsersPage({ searchParams }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/unauthorized-admin");

  const sp = (await searchParams) ?? {};
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const roleParam = typeof sp.role === "string" ? sp.role.trim() : "";
  const role = ROLES.includes(roleParam as UserRole) ? (roleParam as UserRole) : undefined;

  const where: Prisma.UserWhereInput = {};
  if (q) where.email = { contains: q, mode: "insensitive" };
  if (role) where.role = role;

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        lastLoginAt: true,
        suspendedAt: true,
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const qs = new URLSearchParams();
  if (q) qs.set("q", q);
  if (role) qs.set("role", role);
  const base = qs.toString();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Users</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Accounts</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Search by email, filter by role, open a record for notes, suspension, and role changes (audit logged).
      </p>

      <form className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end" method="get">
        <label className="min-w-[200px] flex-1">
          <span className={ui.label}>Email contains</span>
          <input name="q" className={`${ui.input} mt-1`} defaultValue={q} placeholder="studio@…" />
        </label>
        <label className="min-w-[140px]">
          <span className={ui.label}>Role</span>
          <select name="role" className={`${ui.input} mt-1`} defaultValue={role ?? ""}>
            <option value="">Any</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={`${ui.buttonPrimary} sm:mb-0`}>
          Search
        </button>
      </form>

      <p className="mt-6 text-sm text-stone-500">
        {total} accounts · page {page} of {totalPages}
      </p>

      <div className="mt-4">
        <DataTable<(typeof rows)[number]>
          rows={rows}
          empty="No users match."
          columns={[
            {
              key: "email",
              header: "Email",
              cell: (r) => (
                <Link href={`/admin/users/${r.id}`} className="font-medium text-amber-900 underline-offset-2 hover:underline">
                  {r.email}
                </Link>
              ),
            },
            { key: "role", header: "Role", cell: (r) => <code className="text-xs">{r.role}</code> },
            {
              key: "status",
              header: "Status",
              cell: (r) =>
                r.suspendedAt ? (
                  <span className="text-xs font-medium text-red-700">Suspended</span>
                ) : (
                  <span className="text-xs text-stone-500">Active</span>
                ),
            },
            {
              key: "created",
              header: "Joined",
              cell: (r) => <span className="text-xs text-stone-500">{r.createdAt.toISOString().slice(0, 10)}</span>,
            },
          ]}
        />
      </div>

      <div className="mt-6 flex gap-2">
        {page > 1 ? (
          <Link
            href={`/admin/users?${base ? `${base}&` : ""}page=${page - 1}`}
            className={ui.buttonSecondary}
          >
            Previous
          </Link>
        ) : null}
        {page < totalPages ? (
          <Link
            href={`/admin/users?${base ? `${base}&` : ""}page=${page + 1}`}
            className={ui.buttonSecondary}
          >
            Next
          </Link>
        ) : null}
      </div>
    </div>
  );
}
