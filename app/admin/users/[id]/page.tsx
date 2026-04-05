import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { isAdminRole, requireAdminUser } from "@/lib/auth-session";
import { StatCard } from "@/components/admin/stat-card";
import { UserAdminActions } from "./user-admin-actions";
import { UserAdminNotesForm } from "./user-admin-notes";
import { UserAdminTagsPanel } from "./user-admin-tags";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function formatEur(cents: number) {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

function engagementLabel(input: {
  suspendedAt: Date | null;
  orderCount: number;
  bookingCount: number;
  lastLoginAt: Date | null;
  createdAt: Date;
}) {
  if (input.suspendedAt) return { label: "Suspended", score: 0 };
  let score = 35;
  if (input.orderCount > 0 || input.bookingCount > 0) score += 35;
  const recent = input.lastLoginAt ?? input.createdAt;
  const days = (Date.now() - recent.getTime()) / (24 * 60 * 60 * 1000);
  if (days <= 30) score += 30;
  else if (days <= 90) score += 15;
  if (score >= 85) return { label: "High engagement", score };
  if (score >= 60) return { label: "Engaged", score };
  if (score >= 40) return { label: "Low activity", score };
  return { label: "At risk / dormant", score };
}

export default async function AdminUserDetailPage({ params }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/unauthorized-admin");

  const { id } = await params;

  const row = await prisma.user.findUnique({
    where: { id },
    include: {
      customerProfile: true,
      acquisitionAttributions: true,
      ownedStudios: { select: { id: true, displayName: true, status: true } },
      adminNotesReceived: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: { author: { select: { email: true } } },
      },
      _count: {
        select: { orders: true, bookingsAsCustomer: true, ownedStudios: true },
      },
    },
  });

  if (!row) notFound();

  const [orderAgg, recentOrders, recentBookings, recentFeatureActivations] = await Promise.all([
    prisma.order.aggregate({
      where: { customerUserId: id },
      _sum: { totalCents: true },
      _count: { id: true },
    }),
    prisma.order.findMany({
      where: { customerUserId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        createdAt: true,
        totalCents: true,
        paymentStatus: true,
        orderStatus: true,
      },
    }),
    prisma.booking.findMany({
      where: { customerUserId: id },
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        createdAt: true,
        bookingStatus: true,
        paymentStatus: true,
        ticketRef: true,
        experience: { select: { title: true } },
      },
    }),
    prisma.studioFeatureActivation.findMany({
      where: { studio: { ownerUserId: id } },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        updatedAt: true,
        status: true,
        feature: { select: { name: true, slug: true } },
        studio: { select: { displayName: true } },
      },
    }),
  ]);

  type TimelineEntry =
    | {
        kind: "order";
        at: Date;
        id: string;
        totalCents: number;
        paymentStatus: string;
        orderStatus: string;
      }
    | {
        kind: "booking";
        at: Date;
        id: string;
        title: string;
        ticketRef: string | null;
        bookingStatus: string;
        paymentStatus: string;
      }
    | {
        kind: "feature";
        at: Date;
        id: string;
        studioName: string;
        featureName: string;
        featureSlug: string;
        status: string;
      };

  const timeline: TimelineEntry[] = [
    ...recentOrders.map(
      (o): TimelineEntry => ({
        kind: "order",
        at: o.createdAt,
        id: o.id,
        totalCents: o.totalCents,
        paymentStatus: o.paymentStatus,
        orderStatus: o.orderStatus,
      }),
    ),
    ...recentBookings.map(
      (b): TimelineEntry => ({
        kind: "booking",
        at: b.createdAt,
        id: b.id,
        title: b.experience.title,
        ticketRef: b.ticketRef,
        bookingStatus: b.bookingStatus,
        paymentStatus: b.paymentStatus,
      }),
    ),
    ...recentFeatureActivations.map(
      (a): TimelineEntry => ({
        kind: "feature",
        at: a.updatedAt,
        id: a.id,
        studioName: a.studio.displayName,
        featureName: a.feature.name,
        featureSlug: a.feature.slug,
        status: a.status,
      }),
    ),
  ];
  timeline.sort((a, b) => b.at.getTime() - a.at.getTime());
  const timelineTop = timeline.slice(0, 28);

  const acquisition = row.acquisitionAttributions[0] ?? null;
  const engage = engagementLabel({
    suspendedAt: row.suspendedAt,
    orderCount: row._count.orders,
    bookingCount: row._count.bookingsAsCustomer,
    lastLoginAt: row.lastLoginAt,
    createdAt: row.createdAt,
  });

  return (
    <div>
      <Link href="/admin/users" className="text-sm font-medium text-amber-900 hover:underline">
        ← Users
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">User intelligence</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">{row.email}</h1>
      <p className="mt-2 text-sm text-stone-600">
        Role <code className="text-xs">{row.role}</code>
        {row.suspendedAt ? (
          <span className="ml-3 text-red-700">Suspended {row.suspendedAt.toISOString().slice(0, 10)}</span>
        ) : null}
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Engagement score (proxy)" value={`${engage.score}/100`} hint={engage.label} />
        <StatCard label="Orders (linked)" value={String(row._count.orders)} hint={formatEur(orderAgg._sum.totalCents ?? 0)} />
        <StatCard label="Bookings" value={String(row._count.bookingsAsCustomer)} hint="As customer" />
        <StatCard label="Studios owned" value={String(row._count.ownedStudios)} hint="Vendor surface" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <UserAdminActions
          userId={row.id}
          email={row.email}
          role={row.role}
          suspended={!!row.suspendedAt}
          actorIsHyperAdmin={admin.role === "hyper_admin"}
          canImpersonate={
            !row.suspendedAt && row.id !== admin.id && !isAdminRole(row.role)
          }
        />
        <div className="space-y-6">
          <UserAdminTagsPanel
            key={row.adminTags.slice().sort().join("|")}
            userId={row.id}
            initialTags={row.adminTags}
          />
          <UserAdminNotesForm userId={row.id} />
        </div>
      </div>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Recent activity</h2>
        <p className="mt-1 text-xs text-stone-500">
          Newest first: marketplace orders and class bookings as this customer, plus platform add-on changes on studios
          they own.
        </p>
        {timelineTop.length === 0 ? (
          <p className="mt-4 text-sm text-stone-500">No orders, bookings, or add-on events yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100 text-sm">
            {timelineTop.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                <div>
                  {e.kind === "order" ? (
                    <>
                      <span className="font-medium text-amber-950">Order</span>{" "}
                      <Link href={`/admin/orders/${e.id}`} className="text-amber-900 underline">
                        {e.id.slice(0, 8)}…
                      </Link>
                      <span className="ml-2 text-xs text-stone-500">
                        {e.orderStatus} · {e.paymentStatus} · {formatEur(e.totalCents)}
                      </span>
                    </>
                  ) : e.kind === "booking" ? (
                    <>
                      <span className="font-medium text-amber-950">Booking</span>{" "}
                      <Link href={`/admin/bookings/${e.id}`} className="text-amber-900 underline">
                        {e.ticketRef ?? e.id.slice(0, 8) + "…"}
                      </Link>
                      <span className="ml-2 text-xs text-stone-500">
                        {e.title} · {e.bookingStatus} · {e.paymentStatus}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-amber-950">Add-on</span>{" "}
                      <span className="text-stone-700">
                        {e.featureName} <code className="text-xs text-stone-500">({e.featureSlug})</code>
                      </span>
                      <span className="ml-2 text-xs text-stone-500">
                        {e.studioName} · {e.status}
                      </span>
                    </>
                  )}
                </div>
                <time className="shrink-0 text-xs text-stone-400" dateTime={e.at.toISOString()}>
                  {e.at.toISOString().slice(0, 16).replace("T", " ")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Profile</h2>
        <dl className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-stone-400">Created</dt>
            <dd>{row.createdAt.toISOString().slice(0, 10)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-stone-400">Last login</dt>
            <dd>{row.lastLoginAt ? row.lastLoginAt.toISOString().slice(0, 19) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-stone-400">Email verified</dt>
            <dd>{row.emailVerifiedAt ? row.emailVerifiedAt.toISOString().slice(0, 10) : "No"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-stone-400">Full name</dt>
            <dd>{row.customerProfile?.fullName ?? "—"}</dd>
          </div>
        </dl>
      </section>

      {acquisition ? (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-950">Acquisition</h2>
          <p className="mt-2 text-xs text-stone-600">
            {acquisition.utmSource ?? "—"} / {acquisition.utmMedium ?? "—"} / {acquisition.utmCampaign ?? "—"}
          </p>
          <p className="mt-1 text-xs text-stone-500">Landing: {acquisition.landingPath ?? "—"}</p>
        </section>
      ) : null}

      {row.ownedStudios.length > 0 ? (
        <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-amber-950">Studios</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {row.ownedStudios.map((s) => (
              <li key={s.id}>
                <Link href={`/admin/studios/${s.id}`} className="font-medium text-amber-900 underline">
                  {s.displayName}
                </Link>{" "}
                <code className="text-xs text-stone-500">({s.status})</code>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-amber-950">Internal notes</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {row.adminNotesReceived.length === 0 ? (
            <li className="text-stone-500">No notes yet.</li>
          ) : (
            row.adminNotesReceived.map((n) => (
              <li key={n.id} className="border-b border-stone-100 pb-3 last:border-0">
                <p className="text-xs text-stone-400">
                  {n.createdAt.toISOString().slice(0, 16)} · {n.author?.email ?? "unknown"}
                </p>
                <p className="mt-1 whitespace-pre-wrap text-stone-700">{n.content}</p>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
