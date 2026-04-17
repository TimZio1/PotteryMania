import Link from "next/link";
import { redirect } from "next/navigation";
import type { StripeWebhookEventTask, StripeWebhookEvent } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import ResolveWebhookTaskButton from "@/components/admin/resolve-webhook-task-button";

type TaskWithEvent = StripeWebhookEventTask & { event: StripeWebhookEvent | null };

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Webhook events",
  "/admin/webhook-events",
  "Stripe and integration webhook delivery history.",
);

export const dynamic = "force-dynamic";

export default async function AdminWebhookEventsPage() {
  const user = await requireHyperAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const tasks = await prisma.stripeWebhookEventTask.findMany({
    where: { failedAt: { not: null }, resolvedAt: null },
    include: { event: true },
    orderBy: { failedAt: "desc" },
    take: 80,
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm text-[var(--muted)]">
        <Link href="/admin/operations" className="text-amber-900 underline">
          ← Operations
        </Link>
      </p>
      <h1 className="mt-4 font-serif text-3xl text-stone-900">Stripe webhook failures</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Side-effect failures (email, calendar, Spreadconnect) are logged per event. Resolve in Stripe Dashboard or retry
        manually, then mark resolved here.
      </p>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-stone-200 bg-white shadow-sm">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Concern</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--muted)]">
                  No unresolved webhook task failures.
                </td>
              </tr>
            ) : (
              tasks.map((t: TaskWithEvent) => (
                <tr key={t.id} className="border-b border-stone-100">
                  <td className="whitespace-nowrap px-4 py-3 text-[var(--foreground)]">
                    {t.failedAt?.toISOString().slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--foreground)]">{t.concern}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted)]">{t.event?.id ?? t.stripeWebhookEventId}</td>
                  <td className="max-w-md px-4 py-3 text-xs text-[var(--muted)]">{t.failureReason}</td>
                  <td className="px-4 py-3">
                    <ResolveWebhookTaskButton taskId={t.id} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-[var(--muted)]">
        API: <code className="rounded bg-stone-100 px-1">GET /api/admin/webhook-events?status=failed</code> ·{" "}
        <code className="rounded bg-stone-100 px-1">PATCH</code> with <code>{"{ taskId }"}</code>
      </p>
    </div>
  );
}
