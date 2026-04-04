import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export default async function StudioSettingsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const policies = await prisma.cancellationPolicy.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className={ui.overline}>Configuration</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">Settings</h1>
        <p className="mt-2 text-sm text-stone-600">Studio profile, Stripe, activation, and submission live in the studio workspace.</p>
      </div>

      <div className={`${ui.card} space-y-4`}>
        <h2 className="text-lg font-semibold text-stone-900">Studio workspace</h2>
        <p className="text-sm text-stone-600">Edit legal profile, photos, activation, and connect payouts.</p>
        <Link href={`/dashboard/studio/${studioId}`} className={ui.buttonPrimary}>
          Open studio settings
        </Link>
      </div>

      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-stone-900">Cancellation policies</h2>
        <p className="mt-2 text-sm text-stone-600">Managed via API today; list below is read-only.</p>
        <ul className="mt-4 space-y-2 text-sm text-stone-700">
          {policies.length === 0 ? <li className="text-stone-500">No studio-specific policies yet.</li> : null}
          {policies.map((p) => (
            <li key={p.id} className="rounded-lg bg-stone-50 px-3 py-2">
              <span className="font-medium">{p.name}</span> · {p.policyType}
            </li>
          ))}
        </ul>
      </div>

      <div className={ui.card}>
        <h2 className="text-lg font-semibold text-stone-900">Blocked dates</h2>
        <p className="text-sm text-stone-600">Use the API or support to manage studio date blocks until a UI ships here.</p>
      </div>
    </div>
  );
}
