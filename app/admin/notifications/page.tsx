import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { AdminInboxClient } from "./admin-inbox-client";

import type { Metadata } from "next";
import { metaAdminPage } from "@/lib/seo-routes";

export const metadata: Metadata = metaAdminPage(
  "Inbox",
  "/admin/notifications",
  "Platform notifications and alerts.",
);

export const dynamic = "force-dynamic";

export default async function AdminNotificationsPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const [messages, notifications, inboxCount, sentCount, savedCount, deletedCount, unreadCount] = await Promise.all([
    prisma.adminInboxMessage.findMany({
      where: { direction: "inbound", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.adminNotification.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.adminInboxMessage.count({ where: { direction: "inbound", deletedAt: null } }),
    prisma.adminInboxMessage.count({ where: { direction: "outbound", deletedAt: null } }),
    prisma.adminInboxMessage.count({ where: { savedAt: { not: null }, deletedAt: null } }),
    prisma.adminInboxMessage.count({ where: { deletedAt: { not: null } } }),
    prisma.adminInboxMessage.count({ where: { direction: "inbound", readAt: null, deletedAt: null } }),
  ]);

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Inbox</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--foreground)]">Email inbox</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
        Receive, reply, send, save, and delete customer emails from one operator inbox.
      </p>
      <p className="mt-4 text-sm">
        <Link href="/admin" className="font-medium text-amber-900 underline">
          ← Home
        </Link>
      </p>

      <AdminInboxClient
        initialMessages={messages.map((m) => ({
          id: m.id,
          direction: m.direction,
          mailbox: m.mailbox,
          fromEmail: m.fromEmail,
          fromName: m.fromName,
          toEmail: m.toEmail,
          subject: m.subject,
          textBody: m.textBody,
          htmlBody: m.htmlBody,
          readAt: m.readAt?.toISOString() ?? null,
          savedAt: m.savedAt?.toISOString() ?? null,
          deletedAt: m.deletedAt?.toISOString() ?? null,
          sentAt: m.sentAt?.toISOString() ?? null,
          createdAt: m.createdAt.toISOString(),
        }))}
        initialNotifications={notifications.map((n) => ({
          id: n.id,
          title: n.title,
          body: n.body,
          level: n.level,
          readAt: n.readAt?.toISOString() ?? null,
          createdAt: n.createdAt.toISOString(),
        }))}
        initialCounts={{
          inbox: inboxCount,
          sent: sentCount,
          saved: savedCount,
          deleted: deletedCount,
          unread: unreadCount,
        }}
      />
    </div>
  );
}
