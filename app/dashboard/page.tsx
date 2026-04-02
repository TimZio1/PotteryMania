import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  if (user.role === "customer") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-xl font-semibold">Your account</h1>
        <p className="mt-2 text-stone-600">Browse the marketplace and use the cart as a guest or signed-in customer.</p>
        <Link href="/marketplace" className="mt-6 inline-block text-amber-800 underline">
          Go to marketplace
        </Link>
      </div>
    );
  }

  if (user.role !== "vendor") {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <p className="text-stone-600">This dashboard is for studio vendors.</p>
      </div>
    );
  }

  const studios = await prisma.studio.findMany({
    where: { ownerUserId: user.id },
    orderBy: { createdAt: "desc" },
    include: { stripeAccount: true },
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold text-amber-950">Studio dashboard</h1>
      {studios.length === 0 ? (
        <div className="mt-8 rounded-lg border border-stone-200 bg-white p-6">
          <p className="text-stone-600">Create your studio profile to start selling.</p>
          <Link href="/dashboard/studio/new" className="mt-4 inline-block text-amber-800 underline">
            Create studio
          </Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {studios.map((s) => (
            <li key={s.id} className="rounded-lg border border-stone-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-medium">{s.displayName}</h2>
                  <p className="text-sm text-stone-500">Status: {s.status}</p>
                </div>
                <div className="flex gap-3 text-sm">
                  <Link href={`/dashboard/studio/${s.id}`} className="text-amber-800 underline">
                    Edit
                  </Link>
                  <Link href={`/dashboard/products/${s.id}`} className="text-amber-800 underline">
                    Products
                  </Link>
                </div>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                Stripe:{" "}
                {s.stripeAccount?.chargesEnabled && s.stripeAccount?.payoutsEnabled
                  ? "Connected"
                  : "Not connected — complete onboarding"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}