import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

export default async function AdminAiInsightsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const [templates, revenue, purchasedInsights, recentPurchases] = await Promise.all([
    prisma.insightTemplate.findMany({
      orderBy: { slug: "asc" },
      include: {
        _count: {
          select: {
            generatedInsights: true,
          },
        },
      },
    }),
    prisma.insightPurchase.aggregate({ _sum: { amountCents: true }, _count: true }),
    prisma.generatedInsight.count({ where: { status: "purchased" } }),
    prisma.insightPurchase.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        insight: {
          select: {
            previewTitle: true,
            template: { select: { slug: true } },
          },
        },
        studio: { select: { id: true, displayName: true } },
        user: { select: { email: true } },
      },
    }),
  ]);

  const totalEur = (revenue._sum.amountCents ?? 0) / 100;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Monetization</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">AI insights</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Rule-based insight templates, studio-generated cards, and one-time Stripe unlocks. Template CRUD and force-unlock
        can extend the existing admin PATCH patterns when needed.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase text-stone-500">Lifetime purchases</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{revenue._count}</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase text-stone-500">Unlocked insight rows</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">{purchasedInsights}</p>
        </div>
        <div className={ui.card}>
          <p className="text-xs font-medium uppercase text-stone-500">Gross (platform)</p>
          <p className="mt-2 text-2xl font-semibold text-amber-950">€{totalEur.toFixed(2)}</p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-amber-950">Templates</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-600">
            <tr>
              <th className="px-4 py-3">Slug</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3">Generated rows</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((t) => (
              <tr key={t.id} className="border-b border-stone-100">
                <td className="px-4 py-3 font-mono text-xs">{t.slug}</td>
                <td className="px-4 py-3">{t.category}</td>
                <td className="px-4 py-3">{t.title}</td>
                <td className="px-4 py-3">€{(t.basePriceCents / 100).toFixed(2)}</td>
                <td className="px-4 py-3">{t.isActive ? "yes" : "no"}</td>
                <td className="px-4 py-3">{t._count.generatedInsights}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-10 text-lg font-semibold text-amber-950">Recent purchases</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase text-stone-600">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Studio</th>
              <th className="px-4 py-3">Buyer</th>
              <th className="px-4 py-3">Insight</th>
              <th className="px-4 py-3">Amount</th>
            </tr>
          </thead>
          <tbody>
            {recentPurchases.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-stone-500" colSpan={5}>
                  No purchases yet.
                </td>
              </tr>
            ) : (
              recentPurchases.map((p) => (
                <tr key={p.id} className="border-b border-stone-100">
                  <td className="px-4 py-3 whitespace-nowrap text-stone-600">
                    {p.createdAt.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/admin/studios/${p.studio.id}`} className="text-amber-900 underline">
                      {p.studio.displayName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-stone-700">{p.user.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-stone-800">{p.insight.previewTitle}</span>
                    <span className="ml-2 font-mono text-xs text-stone-500">{p.insight.template.slug}</span>
                  </td>
                  <td className="px-4 py-3">€{(p.amountCents / 100).toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
