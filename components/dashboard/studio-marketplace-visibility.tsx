import Link from "next/link";
import { prisma } from "@/lib/db";
import { ui } from "@/lib/ui-styles";

/**
 * Studio-facing visibility hints for the dormant discovery subsystem.
 */
export default async function StudioMarketplaceVisibility({ studioId }: { studioId: string }) {
  const [studio, publicClassCount, activeProductCount] = await Promise.all([
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

  if (!studio) return null;

  const rs = studio.rankingScore;
  const pct = rs?.percentileRank ?? null;
  const band =
    pct == null
      ? null
      : pct >= 80
        ? { label: "Strong", hint: "You’re in a strong visibility band compared to other studios." }
        : pct >= 50
          ? { label: "Solid", hint: "You’re in a solid mid-range band — small improvements to listings and response time add up." }
          : { label: "Building", hint: "Visibility is still building — completing your profile and keeping classes active helps the most." };

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
    tips.push("List at least one product in your studio shop so visitors can buy directly.");
  }
  if (!studio.stripeAccount?.chargesEnabled) {
    tips.push("Finish Stripe Connect onboarding so checkout works smoothly when traffic lands on your listings.");
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
          <p className={ui.overline}>Visibility (dormant)</p>
          <h2 className="mt-1 text-lg font-semibold text-amber-950">Your visibility</h2>
          <p className="mt-2 max-w-2xl text-sm text-stone-600">
            Discovery ranking is currently dormant in public UX. We keep these indicators for internal readiness and
            potential future reactivation.
          </p>
        </div>
        {band ? (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-950">{band.label}</span>
        ) : null}
      </div>

      {!rs ? (
        <p className="mt-4 text-sm text-stone-600">
          A visibility score appears when the ranking update job runs. This score is currently internal-only.
        </p>
      ) : (
        <div className="mt-4 space-y-3 text-sm text-stone-700">
          {pct != null ? (
            <p>
              <span className="font-medium text-amber-950">Percentile (higher is better):</span> {pct}
              {band ? ` — ${band.hint}` : null}
            </p>
          ) : null}
          {updated ? (
            <p className="text-xs text-stone-500">Last recalculated: {updated}</p>
          ) : null}
        </div>
      )}

      <div className="mt-6">
        <p className="text-sm font-semibold text-amber-950">Tips to improve</p>
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
          Shop
        </Link>
        <Link href={`/studios/${studioId}`} className={ui.buttonGhost} target="_blank" rel="noreferrer">
          View public profile
        </Link>
      </div>
    </section>
  );
}

function cnCard() {
  return `${ui.card} space-y-0`;
}
