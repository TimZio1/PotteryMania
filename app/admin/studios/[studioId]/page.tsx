import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { StudioAdminDetailActions } from "@/components/admin/studio-admin-detail-actions";
import { StudioAdminFeatureEntitlements } from "@/components/admin/studio-admin-feature-entitlements";
import { activationGrantsAccess } from "@/lib/studio-features";
import { platformFeatureRequiresStripeSubscription } from "@/lib/studio-feature-billing";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function AdminStudioDetailPage({ params }: Props) {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const { studioId } = await params;

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    include: {
      owner: { select: { id: true, email: true, role: true } },
      stripeAccount: true,
      _count: { select: { products: true, experiences: true, bookings: true } },
    },
  });

  if (!studio) notFound();

  const [paidOrdersCount, pendingOrdersCount, catalogFeatures] = await Promise.all([
    prisma.order.count({
      where: {
        paymentStatus: "paid",
        items: { some: { vendorId: studioId } },
      },
    }),
    prisma.order.count({
      where: {
        orderStatus: "pending",
        items: { some: { vendorId: studioId } },
      },
    }),
    prisma.platformFeature.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        activations: {
          where: { studioId },
          take: 1,
        },
      },
    }),
  ]);

  const featureEntitlementRows = catalogFeatures.map((f) => {
    const act = f.activations[0];
    const accessEffective = !f.isActive
      ? false
      : f.grantByDefault
        ? true
        : act
          ? activationGrantsAccess(act.status, act.trialEndsAt, act.deactivatesAt)
          : false;
    return {
      featureId: f.id,
      slug: f.slug,
      name: f.name,
      grantByDefault: f.grantByDefault,
      platformActive: f.isActive,
      isPaidAddOn: platformFeatureRequiresStripeSubscription(f),
      activation: act
        ? {
            status: act.status,
            overridePriceCents: act.overridePriceCents,
            hasStripeSubscription: Boolean(act.stripeSubscriptionId?.trim()),
            deactivatesAtIso: act.deactivatesAt ? act.deactivatesAt.toISOString() : null,
          }
        : null,
      accessEffective,
    };
  });

  return (
    <div>
      <Link href="/admin/studios" className="text-sm font-medium text-amber-900 hover:underline">
        ← All studios
      </Link>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Studio</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">{studio.displayName}</h1>
      <p className="mt-1 text-sm text-stone-600">
        <code className="text-xs">{studio.status}</code>
        <span className="mx-2 text-stone-300">·</span>
        {studio.city}, {studio.country}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={`/studios/${studio.id}`} className={ui.buttonSecondary} target="_blank" rel="noreferrer">
          Public listing
        </Link>
        <Link href={`/admin/users/${studio.owner.id}`} className={ui.buttonSecondary}>
          Owner profile
        </Link>
        <Link href={`/dashboard/${studio.id}`} className={ui.buttonSecondary}>
          Vendor dashboard
        </Link>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className={`${ui.cardMuted} space-y-3`}>
            <h2 className="text-sm font-semibold text-amber-950">Contact &amp; legal</h2>
            <dl className="grid gap-2 text-sm text-stone-700">
              <div>
                <dt className="text-xs text-stone-500">Email</dt>
                <dd>{studio.email}</dd>
              </div>
              {studio.phone ? (
                <div>
                  <dt className="text-xs text-stone-500">Phone</dt>
                  <dd>{studio.phone}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-xs text-stone-500">Address</dt>
                <dd>
                  {studio.addressLine1}
                  {studio.addressLine2 ? `, ${studio.addressLine2}` : ""}
                  {studio.postalCode ? ` · ${studio.postalCode}` : ""}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Legal name / VAT</dt>
                <dd>
                  {studio.legalBusinessName} · {studio.vatNumber}
                </dd>
              </div>
            </dl>
          </section>

          <section className={`${ui.cardMuted} space-y-3`}>
            <h2 className="text-sm font-semibold text-amber-950">Commerce signals</h2>
            <ul className="space-y-2 text-sm text-stone-700">
              <li>
                <span className="text-stone-500">Activation fee:</span>{" "}
                {studio.activationPaidAt ? (
                  <span className="font-medium text-emerald-800">Paid {studio.activationPaidAt.toISOString().slice(0, 10)}</span>
                ) : (
                  <span className="text-stone-600">Not paid</span>
                )}
              </li>
              <li>
                <span className="text-stone-500">Stripe Connect:</span>{" "}
                {studio.stripeAccount ? (
                  studio.stripeAccount.chargesEnabled && studio.stripeAccount.payoutsEnabled ? (
                    <span className="font-medium text-emerald-800">Charges &amp; payouts enabled</span>
                  ) : (
                    <span className="text-amber-800">Onboarding incomplete ({studio.stripeAccount.onboardingStatus})</span>
                  )
                ) : (
                  <span className="text-stone-500">No account</span>
                )}
              </li>
              <li>
                <span className="text-stone-500">Catalog:</span> {studio._count.experiences} classes,{" "}
                {studio._count.products} products, {studio._count.bookings} bookings
              </li>
              <li>
                <span className="text-stone-500">Orders (this studio):</span> {paidOrdersCount} paid · {pendingOrdersCount}{" "}
                pending checkout
              </li>
              <li>
                <span className="text-stone-500">Marketplace rank weight:</span>{" "}
                <span className="font-mono">{studio.marketplaceRankWeight}</span>
              </li>
            </ul>
          </section>

          <StudioAdminFeatureEntitlements studioId={studio.id} rows={featureEntitlementRows} />
        </div>

        <StudioAdminDetailActions
          studioId={studio.id}
          displayName={studio.displayName}
          status={studio.status}
          marketplaceRankWeight={studio.marketplaceRankWeight}
        />
      </div>
    </div>
  );
}
