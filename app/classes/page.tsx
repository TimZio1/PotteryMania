import Link from "next/link";
import { prisma } from "@/lib/db";

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
    <div className="min-h-screen bg-stone-50">
      <header className="border-b border-stone-200 bg-white px-4 py-4">
        <div className="mx-auto flex max-w-6xl justify-between">
          <Link href="/" className="font-semibold text-amber-900">
            PotteryMania
          </Link>
          <nav className="flex gap-4 text-sm text-stone-700">
            <Link href="/marketplace">Marketplace</Link>
            <Link href="/classes" className="font-medium text-amber-900">
              Classes
            </Link>
            <Link href="/cart">Cart</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-2xl font-semibold text-amber-950">Classes &amp; experiences</h1>
        <p className="mt-2 text-sm text-stone-600">Book a session at a studio. Pay securely with Stripe.</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((ex) => {
            const img = ex.images[0]?.imageUrl;
            const price = ex.priceCents / 100;
            return (
              <Link
                key={ex.id}
                href={`/classes/${ex.id}`}
                className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-sm transition hover:shadow"
              >
                <div className="aspect-video bg-stone-100">
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="p-4">
                  <p className="text-xs text-stone-500">{ex.studio.displayName}</p>
                  <h2 className="font-medium text-stone-900">{ex.title}</h2>
                  <p className="mt-1 text-amber-900">from €{price.toFixed(2)} / person</p>
                </div>
              </Link>
            );
          })}
        </div>
        {experiences.length === 0 && <p className="text-stone-500">No public classes yet.</p>}
      </main>
    </div>
  );
}