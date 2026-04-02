import Link from "next/link";
import { prisma } from "@/lib/db";

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
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl justify-between">
          <Link href="/" className="font-semibold text-amber-900">
            PotteryMania
          </Link>
          <nav className="flex gap-4 text-sm text-stone-700">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/classes">Classes</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-amber-950">Studios</h1>
        <p className="mt-2 text-sm text-stone-600">Browse approved pottery studios and jump into their classes or products.</p>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {studios.map((studio) => (
            <Link
              key={studio.id}
              href={`/studios/${studio.id}`}
              className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm transition hover:shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-medium text-stone-900">{studio.displayName}</h2>
                  <p className="text-sm text-stone-500">
                    {studio.city}, {studio.country}
                  </p>
                </div>
                {studio.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={studio.logoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : null}
              </div>
              {studio.shortDescription ? (
                <p className="mt-4 line-clamp-3 text-sm text-stone-600">{studio.shortDescription}</p>
              ) : null}
              <p className="mt-4 text-xs text-stone-500">
                {studio._count.experiences} experiences · {studio._count.products} products
              </p>
            </Link>
          ))}
        </div>
        {studios.length === 0 ? <p className="mt-6 text-stone-500">No approved studios yet.</p> : null}
      </main>
    </div>
  );
}
