import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdminUser } from "@/lib/auth-session";
import {
  ADMIN_BOOKING_PAYMENT_STATUSES,
  ADMIN_BOOKING_STATUSES,
  findAdminBookingsForList,
} from "@/lib/admin-bookings-query";
import { DataTable } from "@/components/admin/data-table";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

function eur(cents: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR" }).format(cents / 100);
}

function slotDayLabel(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function AdminBookingsPage({ searchParams }: Props) {
  const admin = await requireAdminUser();
  if (!admin) redirect("/unauthorized-admin");

  const sp = (await searchParams) ?? {};
  const pick = (k: string) => (typeof sp[k] === "string" ? sp[k].trim() : "");

  const studioId = pick("studioId");
  const bookingStatus = pick("bookingStatus");
  const paymentStatus = pick("paymentStatus");
  const q = pick("q");
  const slotFrom = pick("slotFrom");
  const slotTo = pick("slotTo");
  const limitRaw = pick("limit");
  const take = Math.min(500, Math.max(20, Number(limitRaw) || 200));

  const [bookings, studios] = await Promise.all([
    findAdminBookingsForList({
      studioId: studioId || null,
      bookingStatus: bookingStatus || null,
      paymentStatus: paymentStatus || null,
      q: q || null,
      slotFrom: slotFrom || null,
      slotTo: slotTo || null,
      take,
    }),
    prisma.studio.findMany({
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
      take: 400,
    }),
  ]);

  const qs = new URLSearchParams();
  if (studioId) qs.set("studioId", studioId);
  if (bookingStatus) qs.set("bookingStatus", bookingStatus);
  if (paymentStatus) qs.set("paymentStatus", paymentStatus);
  if (q) qs.set("q", q);
  if (slotFrom) qs.set("slotFrom", slotFrom);
  if (slotTo) qs.set("slotTo", slotTo);
  if (limitRaw && Number(limitRaw)) qs.set("limit", String(take));
  const filterQs = qs.toString();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Commerce</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Bookings</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Class and experience bookings across studios. Filter by studio, session date, status, or search name, email, and
        ticket reference.
      </p>

      <form className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" method="get">
        <label className="sm:col-span-2 lg:col-span-1">
          <span className={ui.label}>Studio</span>
          <select name="studioId" className={`${ui.input} mt-1`} defaultValue={studioId}>
            <option value="">Any studio</option>
            {studios.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={ui.label}>Booking status</span>
          <select name="bookingStatus" className={`${ui.input} mt-1`} defaultValue={bookingStatus}>
            <option value="">Any</option>
            {ADMIN_BOOKING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={ui.label}>Payment status</span>
          <select name="paymentStatus" className={`${ui.input} mt-1`} defaultValue={paymentStatus}>
            <option value="">Any</option>
            {ADMIN_BOOKING_PAYMENT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className={ui.label}>Session from (UTC date)</span>
          <input name="slotFrom" type="date" className={`${ui.input} mt-1`} defaultValue={slotFrom} />
        </label>
        <label>
          <span className={ui.label}>Session to (UTC date)</span>
          <input name="slotTo" type="date" className={`${ui.input} mt-1`} defaultValue={slotTo} />
        </label>
        <label>
          <span className={ui.label}>Rows</span>
          <select name="limit" className={`${ui.input} mt-1`} defaultValue={String(take)}>
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="300">300</option>
            <option value="500">500</option>
          </select>
        </label>
        <label className="sm:col-span-2 lg:col-span-3">
          <span className={ui.label}>Search (name, email, ticket ref)</span>
          <input name="q" className={`${ui.input} mt-1`} defaultValue={q} placeholder="Contains…" />
        </label>
        <div className="flex flex-wrap gap-2 sm:col-span-2 lg:col-span-3">
          <button type="submit" className={ui.buttonPrimary}>
            Apply
          </button>
          {filterQs ? (
            <Link href="/admin/bookings" className={ui.buttonSecondary}>
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      <p className="mt-6 text-sm text-stone-500">
        Showing up to {bookings.length} booking{bookings.length === 1 ? "" : "s"}
        {filterQs ? " (filtered)" : ""}.
      </p>

      <div className="mt-4">
        <DataTable
          rows={bookings}
          empty="No bookings match these filters."
          columns={[
            {
              key: "session",
              header: "Session (UTC)",
              cell: (b) => (
                <div className="text-xs">
                  <div className="font-medium text-stone-800">{slotDayLabel(b.slot.slotDate)}</div>
                  <div className="text-stone-500">
                    {b.slot.startTime}–{b.slot.endTime}
                  </div>
                </div>
              ),
            },
            {
              key: "class",
              header: "Experience",
              cell: (b) => (
                <div>
                  <div className="font-medium text-stone-800">{b.experience.title}</div>
                  <div className="text-xs text-stone-500">{b.studio.displayName}</div>
                </div>
              ),
            },
            {
              key: "customer",
              header: "Customer",
              cell: (b) => (
                <div>
                  <div className="font-medium text-stone-800">{b.customerName}</div>
                  <div className="text-xs text-stone-600">{b.customerEmail}</div>
                  {b.ticketRef ? <code className="mt-1 block text-[11px] text-amber-900">{b.ticketRef}</code> : null}
                </div>
              ),
            },
            {
              key: "pax",
              header: "Pax",
              className: "w-14",
              cell: (b) => <span className="tabular-nums">{b.participantCount}</span>,
            },
            {
              key: "money",
              header: "Total / paid",
              cell: (b) => (
                <div className="text-xs tabular-nums">
                  <div className="font-medium text-stone-800">{eur(b.totalAmountCents)}</div>
                  <div className="text-stone-500">dep {eur(b.depositAmountCents)}</div>
                </div>
              ),
            },
            {
              key: "bstat",
              header: "Booking",
              cell: (b) => <code className="text-[11px] leading-tight">{b.bookingStatus}</code>,
            },
            {
              key: "pstat",
              header: "Payment",
              cell: (b) => <code className="text-[11px] leading-tight">{b.paymentStatus}</code>,
            },
            {
              key: "created",
              header: "Created",
              cell: (b) => (
                <span className="whitespace-nowrap text-xs text-stone-500">
                  {b.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                </span>
              ),
            },
            {
              key: "open",
              header: "",
              className: "w-20",
              cell: (b) => (
                <Link
                  href={`/admin/bookings/${b.id}`}
                  className="text-sm font-medium text-amber-900 underline-offset-2 hover:underline"
                >
                  View
                </Link>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
