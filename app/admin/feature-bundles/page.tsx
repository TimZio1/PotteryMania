import Link from "next/link";
import { redirect } from "next/navigation";
import FeatureBundlesAdminPanel from "@/components/admin/feature-bundles-admin-panel";
import { featureBundleToDto } from "@/lib/admin-feature-bundle-dto";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function AdminFeatureBundlesPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const [bundles, catalogFeatures] = await Promise.all([
    prisma.featureBundle.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        items: {
          orderBy: { sortOrder: "asc" },
          include: { feature: true },
        },
      },
    }),
    prisma.platformFeature.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true, priceCents: true },
    }),
  ]);

  const initialBundles = bundles.map(featureBundleToDto);
  const catalog = catalogFeatures.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    priceCents: f.priceCents,
  }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Monetization</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Feature bundles</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Group catalog add-ons into a single SKU with a package price and optional promo window. Vendors see bundles on
        Features / Add-ons. Set a Stripe <code className="font-mono text-xs">price_…</code> for one subscription that
        activates every feature in the bundle after Checkout.
      </p>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <Link href="/admin/platform-features" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Platform add-ons (catalog) →
        </Link>
        <Link href="/admin/features" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Feature hub →
        </Link>
      </p>

      <div className="mt-8">
        <FeatureBundlesAdminPanel initialBundles={initialBundles} catalogFeatures={catalog} />
      </div>
    </div>
  );
}
