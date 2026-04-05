import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import PlatformFeaturesAdminTable from "@/components/admin/platform-features-admin-table";

export const dynamic = "force-dynamic";

export default async function AdminPlatformFeaturesPage() {
  const user = await requireAdminUser();
  if (!user) redirect("/unauthorized-admin");

  const features = await prisma.platformFeature.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const initial = features.map((f) => ({
    id: f.id,
    slug: f.slug,
    name: f.name,
    description: f.description,
    category: f.category,
    priceCents: f.priceCents,
    currency: f.currency,
    isActive: f.isActive,
    visibility: f.visibility,
    grantByDefault: f.grantByDefault,
    stripePriceId: f.stripePriceId,
    sortOrder: f.sortOrder,
  }));

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">Monetization</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950">Platform add-ons</h1>
      <p className="mt-2 max-w-2xl text-sm text-stone-600">
        Catalog entries power the studio Features page and runtime gates (for example kiln). Turning off &ldquo;Grant
        all&rdquo; makes each studio rely on an active activation. Set a recurring Stripe Price id (
        <code className="font-mono text-xs">price_…</code>) so vendors can subscribe via Checkout; leave it empty to
        activate toggles without charging.
      </p>
      <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
        <Link href="/admin/features" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Feature hub — adoption & est. MRR by SKU →
        </Link>
        <Link href="/admin/feature-bundles" className="font-medium text-amber-900 underline-offset-2 hover:underline">
          Feature bundles →
        </Link>
      </p>

      <div className="mt-8">
        {initial.length ? (
          <PlatformFeaturesAdminTable initial={initial} />
        ) : (
          <p className="text-sm text-stone-600">
            No rows yet. Run <code className="rounded bg-stone-100 px-1 py-0.5 font-mono text-xs">prisma migrate deploy</code>{" "}
            so seeded catalog is created.
          </p>
        )}
      </div>
    </div>
  );
}
