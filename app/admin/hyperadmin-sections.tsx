"use client";

import type { ReactNode } from "react";

type ScoreCard = {
  label: string;
  value: string;
  note?: string;
  tone?: "default" | "good" | "warn" | "danger";
};

type RankedRow = {
  name: string;
  secondary?: string;
  metricA: string;
  metricB: string;
  metricC?: string;
};

type FunnelStep = {
  label: string;
  value: string;
  note: string;
};

type Gap = {
  title: string;
  detail: string;
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
  financialCards: ScoreCard[];
  userCards: ScoreCard[];
  planCards: ScoreCard[];
  growthCards: ScoreCard[];
  productCards: ScoreCard[];
  opsCards: ScoreCard[];
  riskCards: ScoreCard[];
  controlCards: ScoreCard[];
  forecastCards: ScoreCard[];
  topStudios: RankedRow[];
  topCustomers: RankedRow[];
  riskAccounts: RankedRow[];
  funnelSteps: FunnelStep[];
  alerts: AlertCard[];
  opportunities: RecommendationCard[];
  instrumentationGaps: Gap[];
};

const sectionLinks = [
  ["finance", "Financials"],
  ["users", "Users"],
  ["plans", "Pricing"],
  ["growth", "Growth"],
  ["product", "Product"],
  ["ops", "Operations"],
  ["risk", "Risk"],
  ["controls", "Controls"],
  ["forecast", "Forecasting"],
] as const;

const toneClass: Record<NonNullable<ScoreCard["tone"]>, string> = {
  default: "border-stone-200 bg-white",
  good: "border-emerald-200 bg-emerald-50/70",
  warn: "border-amber-200 bg-amber-50/70",
  danger: "border-red-200 bg-red-50/70",
};

const alertTone: Record<AlertCard["severity"], string> = {
  critical: "border-red-200 bg-red-50 text-red-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  opportunity: "border-emerald-200 bg-emerald-50 text-emerald-900",
};

export function HyperadminSections(props: Props) {
  return (
    <div className="mt-10 space-y-8">
      <nav className="sticky top-3 z-10 overflow-x-auto rounded-2xl border border-stone-200 bg-white/90 p-2 shadow-sm backdrop-blur">
        <div className="flex min-w-max gap-2">
          {sectionLinks.map(([href, label]) => (
            <a
              key={href}
              href={`#${href}`}
              className="rounded-xl px-3 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-100 hover:text-amber-950"
            >
              {label}
            </a>
          ))}
        </div>
      </nav>

      <Section id="finance" eyebrow="Financial Command Center" title="Revenue, take rate, customer value, and margin visibility.">
        <ScoreGrid cards={props.financialCards} />
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <RankedTable
            title="Best revenue contributors"
            subtitle="Studios ranked by current paid commerce."
            rows={props.topStudios}
            headers={["Studio", "Gross revenue", "Platform take", "Volume"]}
          />
          <RankedTable
            title="Most valuable customers"
            subtitle="Users generating the most commerce value so far."
            rows={props.topCustomers}
            headers={["Customer", "Value", "Orders / bookings", "Segment"]}
          />
        </div>
      </Section>

      <Section id="users" eyebrow="Users & Customer Intelligence" title="Who is active, who is valuable, and where conversion energy exists.">
        <ScoreGrid cards={props.userCards} />
      </Section>

      <Section id="plans" eyebrow="Subscription / Package Management" title="Current monetization controls and what still needs productized billing.">
        <ScoreGrid cards={props.planCards} />
      </Section>

      <Section id="growth" eyebrow="Growth & Conversion" title="Lead flow, activation, referral performance, and where funnel friction is visible.">
        <ScoreGrid cards={props.growthCards} />
        <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">Founder funnel</p>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            {props.funnelSteps.map((step) => (
              <article key={step.label} className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{step.label}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-950">{step.value}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{step.note}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section id="product" eyebrow="Product / Feature Usage Analytics" title="Usage proxies available today plus the instrumentation gaps to close next.">
        <ScoreGrid cards={props.productCards} />
        <div className="mt-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-amber-950">Instrumentation needed for feature intelligence</p>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {props.instrumentationGaps.map((gap) => (
              <article key={gap.title} className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4">
                <p className="text-sm font-semibold text-amber-950">{gap.title}</p>
                <p className="mt-2 text-sm leading-6 text-stone-600">{gap.detail}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      <Section id="ops" eyebrow="Operations & System Health" title="Operational reliability signals, payment readiness, sync health, and failure pressure.">
        <ScoreGrid cards={props.opsCards} />
      </Section>

      <Section id="risk" eyebrow="Support / Issues / Refunds / Risk" title="Refund exposure, failed payments, churn proxies, and risk concentration.">
        <ScoreGrid cards={props.riskCards} />
        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <RankedTable
            title="Accounts to watch"
            subtitle="High-value or high-friction users worth founder attention."
            rows={props.riskAccounts}
            headers={["Account", "Commerce value", "Risk signal", "Context"]}
          />
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-semibold text-amber-950">Alerts & recommendations engine</p>
            <div className="mt-5 space-y-3">
              {props.alerts.map((alert) => (
                <article key={alert.title} className={`rounded-2xl border p-4 ${alertTone[alert.severity]}`}>
                  <p className="text-sm font-semibold">{alert.title}</p>
                  <p className="mt-2 text-sm leading-6">{alert.detail}</p>
                </article>
              ))}
              {props.opportunities.map((item) => (
                <article key={item.title} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6">{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section id="controls" eyebrow="Settings / Controls / Feature Flags" title="The practical control layer currently available to the founder.">
        <ScoreGrid cards={props.controlCards} />
      </Section>

      <Section id="forecast" eyebrow="Exports / Reports / Forecasting" title="Directional planning output from current commerce velocity.">
        <ScoreGrid cards={props.forecastCards} />
      </Section>
    </div>
  );
}

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 rounded-4xl border border-stone-200 bg-[linear-gradient(180deg,#fbfaf8_0%,#f6f2ed_100%)] p-6 shadow-sm sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">{eyebrow}</p>
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-amber-950">{title}</h3>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ScoreGrid({ cards }: { cards: ScoreCard[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article key={card.label} className={`rounded-2xl border p-5 shadow-sm ${toneClass[card.tone ?? "default"]}`}>
          <p className="text-sm text-stone-500">{card.label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-amber-950">{card.value}</p>
          {card.note ? <p className="mt-2 text-sm leading-6 text-stone-600">{card.note}</p> : null}
        </article>
      ))}
    </div>
  );
}

function RankedTable({
  title,
  subtitle,
  rows,
  headers,
}: {
  title: string;
  subtitle: string;
  rows: RankedRow[];
  headers: [string, string, string, string];
}) {
  return (
    <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
      <p className="text-sm font-semibold text-amber-950">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="mt-5 text-sm text-stone-500">No data yet.</p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-stone-500">
              <tr className="border-b border-stone-200">
                {headers.map((header) => (
                  <th key={header} className="px-0 py-3 pr-4 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.name}-${row.secondary ?? ""}`} className="border-b border-stone-100 last:border-b-0">
                  <td className="px-0 py-4 pr-4">
                    <p className="font-medium text-amber-950">{row.name}</p>
                    {row.secondary ? <p className="text-xs text-stone-500">{row.secondary}</p> : null}
                  </td>
                  <td className="px-0 py-4 pr-4 text-stone-700">{row.metricA}</td>
                  <td className="px-0 py-4 pr-4 text-stone-700">{row.metricB}</td>
                  <td className="px-0 py-4 text-stone-700">{row.metricC ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
