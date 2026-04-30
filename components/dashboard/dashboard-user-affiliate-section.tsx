import Link from "next/link";
import { formatWearMoney } from "@/lib/wear-money";
import { platformUi } from "@/lib/ui-styles";
import type { UserAffiliateProgramRow } from "@/lib/wear-user-affiliate-dashboard";
import { DashboardAffiliateCopyButton } from "@/components/dashboard/dashboard-affiliate-copy-button";

const EUR = "EUR";

function formatShortDate(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "—";
  }
}

/** Compact line on the vendor studio list when that studio has a `/w/{code}` affiliate program. */
export function DashboardVendorStudioAffiliateHint({ row }: { row: UserAffiliateProgramRow }) {
  return (
    <div className="mt-4 rounded-(--pm-radius-card) border border-emerald-200/70 bg-emerald-50/50 p-(--pm-space-3) text-sm">
      <p className="font-semibold text-stone-900">Apparel affiliate link</p>
      <p className="mt-1 break-all font-mono text-xs text-stone-800">{row.shareUrl}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {row.referredOrders} attributed orders · {formatWearMoney(row.unpaidCents, EUR)} accruing ·{" "}
        {formatWearMoney(row.payoutPendingCents, EUR)} paying out · {formatWearMoney(row.paidCents, EUR)} paid
      </p>
      <div className="mt-2 flex flex-wrap gap-3 text-xs font-medium">
        <DashboardAffiliateCopyButton text={row.shareUrl} />
        <Link
          href={`/w/${encodeURIComponent(row.code)}`}
          className="inline-flex items-center text-emerald-800 underline underline-offset-2"
          target="_blank"
          rel="noreferrer"
        >
          Preview
        </Link>
        <Link href={`/dashboard/${row.studioId}/commerce/wearables`} className="text-[var(--foreground)] underline underline-offset-2">
          Wear partner settings
        </Link>
      </div>
    </div>
  );
}

export function DashboardUserAffiliateSection({ rows }: { rows: UserAffiliateProgramRow[] }) {
  if (rows.length === 0) return null;

  return (
    <div className={`${platformUi.card} mt-8 border border-emerald-200/80 bg-emerald-50/40`}>
      <p className={platformUi.overline}>Apparel partner</p>
      <h2 className="mt-2 text-lg font-semibold text-[var(--foreground)]">Your affiliate link &amp; results</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Share your link so purchases on the drop credit your commission. Payouts run through Stripe once your bank is
        connected.
      </p>

      <div className="mt-6 space-y-6">
        {rows.map((row) => (
          <div key={row.studioId} className="rounded-(--pm-radius-card) border border-stone-200/80 bg-white/90 p-(--pm-space-4) sm:p-(--pm-space-5)">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <h3 className="text-base font-semibold text-[var(--foreground)]">{row.displayName}</h3>
              <p className="text-xs text-[var(--muted)]">
                Rate {row.marginPercentLabel}
                {!row.enabled ? (
                  <span className="ml-2 font-medium text-amber-800">· Paused</span>
                ) : null}
              </p>
            </div>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <p className="min-w-0 break-all font-mono text-xs text-stone-800 sm:text-sm">{row.shareUrl}</p>
              <DashboardAffiliateCopyButton text={row.shareUrl} />
            </div>

            {!row.stripePayoutsReady ? (
              <p className="mt-3 text-sm text-amber-900">
                <span className="font-medium">Bank setup:</span> finish Stripe in your studio so we can pay you.{" "}
                <Link
                  href={`/dashboard/${row.studioId}/guided`}
                  className="font-semibold underline underline-offset-2 hover:text-amber-950"
                >
                  Open simple setup
                </Link>
              </p>
            ) : null}

            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-[var(--muted)]">Attributed orders</dt>
                <dd className="mt-0.5 font-semibold text-[var(--foreground)]">{row.referredOrders}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Accruing</dt>
                <dd className="mt-0.5 font-semibold text-emerald-800">{formatWearMoney(row.unpaidCents, EUR)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Paying out</dt>
                <dd className="mt-0.5 font-semibold text-stone-900">{formatWearMoney(row.payoutPendingCents, EUR)}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Paid</dt>
                <dd className="mt-0.5 font-semibold text-stone-900">{formatWearMoney(row.paidCents, EUR)}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-[var(--muted)]">Last credited sale: {formatShortDate(row.lastSaleAt)}</p>

            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
              <Link
                href={`/w/${encodeURIComponent(row.code)}`}
                className="font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950"
                target="_blank"
                rel="noreferrer"
              >
                Preview landing
              </Link>
              <Link href={`/dashboard/${row.studioId}`} className="font-medium text-[var(--foreground)] underline underline-offset-2 hover:text-stone-800">
                Studio dashboard
              </Link>
              <Link href="/wear/partner" className="text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]">
                Partner info
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
