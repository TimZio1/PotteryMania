import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";
import { PackagePurchaseForm } from "@/components/packages/package-purchase-form";
import { buildMetadata } from "@/lib/seo";
import { MarketingLayout } from "@/components/marketing-layout";
import { Breadcrumbs } from "@/components/breadcrumbs";

type Props = { params: Promise<{ studioId: string }> };

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { studioId } = await params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, status: "approved" },
    select: { displayName: true },
  });
  if (!studio) {
    return buildMetadata({
      title: "Packages not available",
      description: "This studio isn’t selling class packages right now.",
      path: `/studios/${studioId}/packages`,
    });
  }
  return buildMetadata({
    title: `${studio.displayName} — Class packages`,
    description: `Pay once for a bundle of classes at ${studio.displayName}, then book in whenever you like.`,
    path: `/studios/${studioId}/packages`,
  });
}

export default async function StudioPackagesPublicPage({ params }: Props) {
  const { studioId } = await params;
  const [studio, packages, user] = await Promise.all([
    prisma.studio.findFirst({
      where: { id: studioId, status: "approved" },
      select: { id: true, displayName: true },
    }),
    prisma.classPackage.findMany({
      where: {
        studioId,
        isActive: true,
        isVisible: true,
      },
      orderBy: [{ createdAt: "desc" }],
      include: {
        items: {
          include: {
            experience: { select: { id: true, title: true } },
          },
        },
      },
    }),
    getSessionUser(),
  ]);
  if (!studio) notFound();

  const today = new Date().toISOString().slice(0, 10);

  const toolbar = (
    <Breadcrumbs items={[{ label: studio.displayName, href: `/studios/${studio.id}` }, { label: "Packages" }]} />
  );

  return (
    <MarketingLayout toolbar={toolbar}>
    <main className={`${ui.pageContainer} py-8 sm:py-12`}>
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-amber-950">Class packages</h1>
          <p className="mt-2 text-sm text-stone-600">
            Pay once, spend the credits on classes at {studio.displayName} whenever you like. Usually cheaper than booking one at a time.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className={`${ui.cardMuted}`}>
            <p className="font-medium text-stone-800">No packages on sale right now</p>
            <p className="mt-2 text-sm text-stone-600">
              This studio isn&rsquo;t selling class packages at the moment. Book a one-off class instead, or check back later.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg) => {
              const totalCredits =
                pkg.generalItemLimit ?? pkg.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
              const soldOut = pkg.maxSetsForSale != null && pkg.soldCount >= pkg.maxSetsForSale;
              return (
                <section key={pkg.id} className={`${ui.card} space-y-4`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-amber-950">{pkg.name}</h2>
                      <p className="mt-1 text-sm text-stone-600">
                        €{(pkg.priceCents / 100).toFixed(2)} · {totalCredits} credit{totalCredits === 1 ? "" : "s"} · use them within {pkg.validityDays} days
                      </p>
                    </div>
                    {soldOut ? (
                      <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">Sold out</span>
                    ) : null}
                  </div>

                  {pkg.description ? <p className="text-sm text-stone-700">{pkg.description}</p> : null}

                  <div className="rounded-xl border border-stone-200 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">What&rsquo;s included</p>
                    <ul className="mt-2 space-y-1 text-sm text-stone-700">
                      {pkg.items.map((item) => (
                        <li key={item.id}>
                          {item.experience.title} · {item.quantity} credit{item.quantity === 1 ? "" : "s"} per booking
                        </li>
                      ))}
                    </ul>
                  </div>

                  {!user ? (
                    <p className="text-sm text-stone-600">
                      <Link href={`/login?callbackUrl=${encodeURIComponent(`/studios/${studio.id}/packages`)}`} className="font-medium text-amber-900 hover:underline">
                        Sign in
                      </Link>{" "}
                      or{" "}
                      <Link href={`/register?callbackUrl=${encodeURIComponent(`/studios/${studio.id}/packages`)}`} className="font-medium text-amber-900 hover:underline">
                        create a free account
                      </Link>{" "}
                      to grab this package.
                    </p>
                  ) : soldOut ? (
                    <p className="text-sm text-rose-700">This package is sold out for now — ask the studio if there&rsquo;s a waitlist.</p>
                  ) : (
                    <PackagePurchaseForm packageId={pkg.id} defaultStartDate={today} />
                  )}
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
    </MarketingLayout>
  );
}
