import Link from "next/link";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";

/** Studio-facing health hints based on profile completeness and studio activity. */
export default async function StudioMarketplaceVisibility({ studioId }: { studioId: string }) {
  type StudioHealth = {
    coverImageUrl: string | null;
    logoUrl: string | null;
    shortDescription: string | null;
    latitude: number | null;
    longitude: number | null;
    rankingScore: { percentileRank: number | null; calculatedAt: Date | null } | null;
    stripeAccount: { chargesEnabled: boolean } | null;
  } | null;

  let studio: StudioHealth = null;
  let publicClassCount = 0;
  let activeProductCount = 0;

  try {
    [studio, publicClassCount, activeProductCount] = await Promise.all([
      prisma.studio.findUnique({
        where: { id: studioId },
        select: {
          coverImageUrl: true,
          logoUrl: true,
          shortDescription: true,
          latitude: true,
          longitude: true,
          rankingScore: {
            select: {
              percentileRank: true,
              calculatedAt: true,
            },
          },
          stripeAccount: { select: { chargesEnabled: true } },
        },
      }),
      prisma.experience.count({
        where: { studioId, status: "active", visibility: "public" },
      }),
      prisma.product.count({
        where: { studioId, status: "active" },
      }),
    ]);
  } catch {
    return (
      <section className={cnCard()}>
        <p className="text-sm text-stone-600">Studio health data is temporarily unavailable. Please try refreshing the page.</p>
      </section>
    );
  }

  if (!studio) return null;

  const rs = studio.rankingScore;
  const pct = rs?.percentileRank ?? null;
  const band =
    pct == null
      ? null
      : pct >= 80
        ? { label: "Strong", hint: "Your studio page and activity signals are in a strong band." }
        : pct >= 50
          ? { label: "Solid", hint: "You are in a healthy middle band. Small improvements to your page and response time add up." }
          : { label: "Building", hint: "Still building. A complete page and active experiences help the most." };

  const tips: string[] = [];
  if (!studio.coverImageUrl?.trim() || !studio.logoUrl?.trim()) {
    tips.push("Add a cover image and logo on your public profile — richer profiles tend to earn more trust.");
  }
  if (!studio.shortDescription?.trim()) {
    tips.push("Write a short studio description so visitors immediately understand what you offer.");
  }
  if (publicClassCount === 0) {
    tips.push("Publish at least one public class so visitors can book directly from your studio page.");
  }
  if (activeProductCount === 0) {
    tips.push("Add at least one product to your catalog so visitors can buy directly from your studio page.");
  }
  if (!studio.stripeAccount?.chargesEnabled) {
    tips.push("Finish Stripe Connect onboarding so direct payments work smoothly when visitors reach your studio page.");
  }
  if (tips.length === 0) {
    tips.push("Keep updating classes and products, confirm bookings promptly, and gather reviews — consistency beats one-off spikes.");
  }

  const updated = rs?.calculatedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(rs.calculatedAt)
    : null;

  return (
    <section className={cnCard()}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className={ui.overline}>Studio health</p>
          <h2 className="mt-1 text-lg font-semibold text-amber-950">Public page readiness</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            These internal signals help you keep your studio page complete, easy to trust, and ready for direct bookings.
          </p>
        </div>
        {band ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">{band.label}</span>
        ) : null}
      </div>

      {!rs ? (
        <p className="mt-4 text-sm text-stone-600">
          A score appears after the health job runs. It is internal-only today.
        </p>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-stone-700">
          {pct != null ? (
            <p>
              <span className="font-medium text-amber-950">Health percentile (higher is better):</span> {pct}
              {band ? ` — ${band.hint}` : null}
            </p>
          ) : null}
          {updated ? (
            <p className="text-xs text-stone-500">Last recalculated: {updated}</p>
          ) : null}
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold text-amber-950">Ways to improve</p>
        <ul className="mt-2 list-inside list-disc space-y-1.5 text-sm text-stone-700">
          {tips.slice(0, 5).map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 text-sm">
        <Link href={`/dashboard/${studioId}/settings`} className={ui.buttonSecondary}>
          Studio settings
        </Link>
        <Link href={`/dashboard/${studioId}/classes`} className={ui.buttonGhost}>
          Classes
        </Link>
        <Link href={`/dashboard/${studioId}/shop`} className={ui.buttonGhost}>
          Catalog
        </Link>
        <Link href={`/studios/${studioId}`} className={ui.buttonGhost} target="_blank" rel="noreferrer">
          View public page
        </Link>
      </div>
    </section>
  );
}

function cnCard() {
  return `${ui.card} space-y-0`;
}
