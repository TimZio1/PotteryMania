import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { ui } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

const PREVIEW = [
  {
    title: "Pricing may sit below similar studios",
    benefit: "Potential +€120–400/mo if aligned with demand",
    price: "€2.00",
  },
  {
    title: "A weekday column is under-filled",
    benefit: "Improving occupancy could add ~15–25% class revenue",
    price: "€1.50",
  },
  {
    title: "Repeat students trail the network median",
    benefit: "Retention work often pays back within 60 days",
    price: "€3.50",
  },
];

export default async function StudioAiPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");
  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <p className={ui.overline}>Intelligence</p>
        <h1 className="mt-1 text-2xl font-semibold text-amber-950">AI Advisor</h1>
        <p className="mt-2 text-sm text-stone-600">
          Short previews only. Full diagnosis, benchmarks, and steps unlock per insight when billing is live.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-3">
        {PREVIEW.map((p) => (
          <div key={p.title} className={ui.cardMuted}>
            <p className="text-sm font-semibold text-amber-950">{p.title}</p>
            <p className="mt-3 text-xs text-stone-600">{p.benefit}</p>
            <p className="mt-4 text-sm font-medium text-stone-800">Unlock full analysis · {p.price}</p>
            <button
              type="button"
              disabled
              className={`${ui.buttonSecondary} mt-4 w-full cursor-not-allowed opacity-60`}
              title="Coming with AI billing"
            >
              Unlock full analysis
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-stone-500">
        Insights will be generated from your bookings, sales, and schedules — not generic tips.{" "}
        <Link href={`/dashboard/${studioId}`} className="text-amber-900 underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
