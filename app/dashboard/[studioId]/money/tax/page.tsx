import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Tax",
    "money/tax",
    "Tax totals for bookings and products (last 30 days).",
  );
}

export default async function StudioTaxReportPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, displayName: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const to = new Date();
  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [bookings, orders, experiences] = await Promise.all([
    prisma.booking.findMany({
      where: {
        studioId,
        bookingStatus: { in: ["confirmed", "completed"] },
        createdAt: { gte: from, lte: to },
      },
      select: { totalAmountCents: true, experienceId: true },
    }),
    prisma.orderItem.findMany({
      where: {
        vendorId: studioId,
        order: { createdAt: { gte: from, lte: to }, paymentStatus: "paid" },
      },
      select: { priceSnapshotCents: true, quantity: true, order: { select: { taxCents: true } } },
    }),
    prisma.experience.findMany({
      where: { studioId },
      orderBy: { title: "asc" },
      select: { id: true, title: true, taxRateBps: true },
    }),
  ]);

  const taxRateByExperience = new Map(experiences.map((exp) => [exp.id, exp.taxRateBps]));
  const bookingGrossCents = bookings.reduce((sum, b) => sum + b.totalAmountCents, 0);
  const bookingTaxCents = bookings.reduce((sum, b) => sum + Math.round((b.totalAmountCents * (taxRateByExperience.get(b.experienceId) ?? 0)) / 10_000), 0);
  const orderGrossCents = orders.reduce((sum, item) => sum + item.priceSnapshotCents * item.quantity, 0);
  const orderTaxCents = orders.reduce((sum, item) => sum + (item.order.taxCents || 0), 0);
  const gross = bookingGrossCents + orderGrossCents;
  const tax = bookingTaxCents + orderTaxCents;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className={ui.overline}>Money</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Tax (last 30 days)</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">Tax collected on bookings and products for {studio.displayName}.</p>
      </div>

      <section className={ui.card}>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs text-[var(--muted)]">Gross</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">€{(gross / 100).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs text-[var(--muted)]">Tax</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">€{(tax / 100).toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3">
            <p className="text-xs text-[var(--muted)]">Net</p>
            <p className="mt-1 text-lg font-semibold text-stone-900">€{((gross - tax) / 100).toFixed(2)}</p>
          </div>
        </div>
      </section>

      <section className={ui.card}>
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Tax rate per class</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="text-[var(--muted)]">
                <th className="pb-2 font-medium">Class</th>
                <th className="pb-2 font-medium">Tax rate</th>
              </tr>
            </thead>
            <tbody>
              {experiences.map((exp) => (
                <tr key={exp.id} className="border-t border-stone-200">
                  <td className="py-2 text-stone-900">{exp.title}</td>
                  <td className="py-2 text-[var(--foreground)]">{(exp.taxRateBps / 100).toFixed(2)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
