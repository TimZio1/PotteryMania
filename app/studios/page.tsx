import Link from "next/link";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

export default async function StudiosPage() {
  const studios = await prisma.studio.findMany({
    where: { status: "approved" },
    orderBy: { displayName: "asc" },
    include: {
      _count: { select: { products: true, experiences: true } },
    },
  });

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="max-w-2xl">
          <p className={ui.overline}>Studios</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">Independent makers</h1>
          <p className="mt-3 text-stone-600">
            Every studio here is verified. Open a profile to see classes and products in one place.
          </p>
        </div>

        {studios.length === 0 ? (
          <p className="mt-10 text-stone-500">No approved studios yet.</p>
        ) : (
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {studios.map((studio) => (
              <Link
                key={studio.id}
                href={`/studios/${studio.id}`}
                className={`${ui.tile} flex flex-col p-5 sm:p-6`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-stone-900">{studio.displayName}</h2>
                    <p className="mt-1 text-sm text-stone-500">
                      {studio.city}, {studio.country}
                    </p>
                  </div>
                  {studio.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={studio.logoUrl} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-stone-100" />
                  ) : null}
                </div>
                {studio.shortDescription ? (
                  <p className="mt-4 line-clamp-3 text-sm text-stone-600">{studio.shortDescription}</p>
                ) : null}
                <p className="mt-4 text-xs font-medium text-stone-500">
                  {studio._count.experiences} classes · {studio._count.products} products
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </MarketingLayout>
  );
}
