import Link from "next/link";
import { prisma } from "@/lib/db";
import { MarketingLayout } from "@/components/marketing-layout";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

export default async function ClassesPage() {
  const experiences = await prisma.experience.findMany({
    where: {
      status: "active",
      visibility: "public",
      studio: { status: "approved" },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      studio: { select: { displayName: true, city: true, country: true } },
      images: { where: { isPrimary: true }, take: 1 },
    },
  });

  return (
    <MarketingLayout>
      <main className={`${ui.pageContainer} py-8 sm:py-12`}>
        <div className="max-w-2xl">
          <p className={ui.overline}>Book</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-amber-950 sm:text-4xl">
            Classes &amp; experiences
          </h1>
          <p className="mt-3 text-stone-600">
            Pick a session at a studio. Pricing is per person; deposits and policies are shown before you pay.
          </p>
        </div>

        {experiences.length === 0 ? (
          <div className={`${ui.cardMuted} mt-10 max-w-lg`}>
            <p className="font-medium text-stone-800">No public classes yet</p>
            <p className="mt-2 text-sm text-stone-600">
              Explore{" "}
              <Link href="/studios" className="font-medium text-amber-900 underline underline-offset-2">
                studios
              </Link>{" "}
              or the{" "}
              <Link href="/marketplace" className="font-medium text-amber-900 underline underline-offset-2">
                marketplace
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {experiences.map((ex) => {
              const img = ex.images[0]?.imageUrl;
              const price = ex.priceCents / 100;
              return (
                <Link key={ex.id} href={`/classes/${ex.id}`} className={ui.tile}>
                  <div className="aspect-video bg-stone-100">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-stone-400">No image</div>
                    )}
                  </div>
                  <div className="p-4 sm:p-5">
                    <p className="text-xs font-medium text-stone-500">{ex.studio.displayName}</p>
                    <h2 className="mt-1 text-base font-semibold text-stone-900">{ex.title}</h2>
                    <p className="mt-2 text-sm font-medium text-amber-950">From €{price.toFixed(2)} / person</p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </MarketingLayout>
  );
}
