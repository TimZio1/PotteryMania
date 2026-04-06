import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { NotificationsMarkRead } from "./notifications-mark-read";

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const items = await prisma.adminNotification.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Inbox</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Admin notifications</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Operational notes and alerts. Create via <code className="text-xs">POST /api/admin/notifications</code> (auth) or
        seed scripts.
      </p>
      <p className="mt-4 text-sm">
        <Link href="/admin" className="font-medium text-amber-900 underline">
          ← Control center
        </Link>
      </p>

      <ul className="mt-8 divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {items.map((n) => (
          <li key={n.id} className="flex flex-col gap-2 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-medium text-stone-900">{n.title}</p>
              {n.body ? <p className="mt-1 text-sm text-stone-600">{n.body}</p> : null}
              <p className="mt-2 text-xs text-stone-400">{n.createdAt.toISOString()}</p>
            </div>
            <div className="shrink-0">
              {n.readAt ? (
                <span className="text-xs text-stone-500">Read</span>
              ) : (
                <NotificationsMarkRead id={n.id} />
              )}
            </div>
          </li>
        ))}
        {items.length === 0 ? <li className="px-4 py-8 text-sm text-stone-500">No notifications.</li> : null}
      </ul>
    </div>
  );
}
