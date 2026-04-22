import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { StatCard } from "@/components/admin/stat-card";
import { DataTable } from "@/components/admin/data-table";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Content",
  "/admin/content",
  "Catalog health across studios.",
);

export const dynamic = "force-dynamic";

export default async function AdminContentPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const [
    productsActive,
    productsDraft,
    experiencesActive,
    experiencesDraft,
    studiosApproved,
    pendingStudios,
    recentProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { status: "active" } }),
    prisma.product.count({ where: { status: "draft" } }),
    prisma.experience.count({ where: { status: "active" } }),
    prisma.experience.count({ where: { status: "draft" } }),
    prisma.studio.count({ where: { status: "approved" } }),
    prisma.studio.count({ where: { status: "pending_review" } }),
    prisma.product.findMany({
      orderBy: { updatedAt: "desc" },
      take: 15,
      select: { id: true, title: true, status: true, studio: { select: { displayName: true } } },
    }),
  ]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Content</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Catalog health</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Products, classes, and studio records across the platform.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active products" value={String(productsActive)} hint={`${productsDraft} draft`} />
        <StatCard label="Active classes" value={String(experiencesActive)} hint={`${experiencesDraft} draft`} />
        <StatCard label="Approved studios" value={String(studiosApproved)} hint={`${pendingStudios} awaiting review`} />
      </div>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Latest product edits</h2>
        <div className="mt-4">
          <DataTable
            rows={recentProducts}
            empty="No products yet."
            columns={[
              { key: "t", header: "Title", cell: (r) => r.title },
              { key: "s", header: "Studio", cell: (r) => r.studio.displayName },
              { key: "st", header: "Status", cell: (r) => <code className="text-xs">{r.status}</code> },
            ]}
          />
        </div>
      </section>
    </div>
  );
}
