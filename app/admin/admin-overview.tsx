type Kpi = {
  label: string;
  value: string;
  delta?: string;
  tone?: "default" | "good" | "warn" | "danger";
};

type TrendPoint = {
  label: string;
  value: number;
};

type AlertCard = {
  title: string;
  severity: "critical" | "warning" | "opportunity";
  detail: string;
};

type RecommendationCard = {
  title: string;
  detail: string;
};

type Props = {
  founderSummary: string;
  kpis: Kpi[];
  revenueTrend: TrendPoint[];
  orderTrend: TrendPoint[];
  bookingTrend: TrendPoint[];
  pendingStudios: number;
  leadCount: number;
  awaitingApprovalBookings: number;
  manualRefundQueue: number;
  activeStudios: number;
  paidOrdersThisMonth: number;
  grossRevenueMonthEur: string;
  platformCommissionMonthEur: string;
  bookingCashMonthEur: string;
  alerts: AlertCard[];
  opportunities: RecommendationCard[];
};

const severityClass: Record<AlertCard["severity"], string> = {
  critical: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  opportunity: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function AdminOverview(props: Props) {
  return (
    <section className="mt-8 space-y-8">
      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Executive overview</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">
            Run the company from one screen.
          </h2>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-stone-600 sm:text-base">{props.founderSummary}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {props.kpis.map((kpi) => (
              <article key={kpi.label} className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-5">
                <p className="text-sm text-stone-500">{kpi.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-950">{kpi.value}</p>
                {kpi.delta ? (
                  <p
                    className={`mt-2 text-xs font-medium ${
                      kpi.tone === "danger"
                        ? "text-red-700"
                        : kpi.tone === "warn"
                          ? "text-amber-700"
                          : kpi.tone === "good"
                            ? "text-emerald-700"
                            : "text-stone-500"
                    }`}
                  >
                    {kpi.delta}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-[linear-gradient(180deg,#fffaf5_0%,#f8f1e8_100%)] p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Financial command center</p>
          <dl className="mt-6 space-y-5">
            <MetricRow label="Gross revenue this month" value={`€${props.grossRevenueMonthEur}`} />
            <MetricRow label="Platform commission this month" value={`€${props.platformCommissionMonthEur}`} />
            <MetricRow label="Booking cash collected" value={`€${props.bookingCashMonthEur}`} />
            <MetricRow label="Paid orders this month" value={String(props.paidOrdersThisMonth)} />
            <MetricRow label="Active studios" value={String(props.activeStudios)} />
            <MetricRow label="Leads in pipeline" value={String(props.leadCount)} />
          </dl>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <TrendCard title="Revenue trend (last 30 days)" subtitle="Paid order GMV" data={props.revenueTrend} prefix="€" />
        <TrendCard title="Order flow" subtitle="Orders created per day" data={props.orderTrend} />
        <TrendCard title="Booking flow" subtitle="Bookings created per day" data={props.bookingTrend} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr_1fr]">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">What needs attention now</p>
          <div className="mt-5 space-y-3">
            {props.alerts.map((alert) => (
              <article key={alert.title} className={`rounded-2xl border p-4 ${severityClass[alert.severity]}`}>
                <p className="text-sm font-semibold">{alert.title}</p>
                <p className="mt-2 text-sm leading-6">{alert.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Big opportunities</p>
          <div className="mt-5 grid gap-3">
            {props.opportunities.map((item) => (
              <article key={item.title} className="rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <p className="text-sm font-semibold text-emerald-950">{item.title}</p>
                <p className="mt-2 text-sm leading-6 text-emerald-900">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Operational pressure points</p>
          <div className="mt-5 grid gap-3">
            <SnapshotCard label="Studios awaiting review" value={props.pendingStudios} tone="warn" />
            <SnapshotCard label="Bookings awaiting vendor approval" value={props.awaitingApprovalBookings} tone="warn" />
            <SnapshotCard label="Manual refund queue" value={props.manualRefundQueue} tone="danger" />
            <SnapshotCard label="Early-access pipeline" value={props.leadCount} tone="good" />
          </div>
        </section>
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-stone-200/70 pb-4 last:border-b-0 last:pb-0">
      <dt className="text-sm text-stone-500">{label}</dt>
      <dd className="text-lg font-semibold tracking-tight text-amber-950">{value}</dd>
    </div>
  );
}

function TrendCard({
  title,
  subtitle,
  data,
  prefix = "",
}: {
  title: string;
  subtitle: string;
  data: TrendPoint[];
  prefix?: string;
}) {
  const max = Math.max(...data.map((point) => point.value), 1);

  return (
    <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-amber-950">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      <div className="mt-6 flex h-48 items-end gap-2">
        {data.map((point) => {
          const height = Math.max(10, Math.round((point.value / max) * 100));
          return (
            <div key={point.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="text-[11px] font-medium text-stone-500">
                {prefix}
                {Math.round(point.value).toLocaleString()}
              </div>
              <div className="w-full rounded-full bg-stone-100" style={{ height: `${height}%` }}>
                <div
                  className="h-full w-full rounded-full bg-[linear-gradient(180deg,#c38962_0%,#6d4530_100%)]"
                  aria-hidden
                />
              </div>
              <div className="text-[11px] text-stone-400">{point.label}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SnapshotCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "warn" | "danger";
}) {
  return (
    <article
      className={`rounded-2xl border p-4 ${
        tone === "danger"
          ? "border-red-200 bg-red-50"
          : tone === "warn"
            ? "border-amber-200 bg-amber-50"
            : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.18em] ${
          tone === "danger" ? "text-red-700" : tone === "warn" ? "text-amber-700" : "text-emerald-700"
        }`}
      >
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-950">{value}</p>
    </article>
  );
}
