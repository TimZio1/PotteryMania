import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dashboardStudioMeta } from "@/lib/dashboard-metadata";
import { ui } from "@/lib/ui-styles";
import GiftCardsManager from "@/components/dashboard/gift-cards-manager";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ studioId: string }> };

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { studioId } = await params;
  return dashboardStudioMeta(
    studioId,
    "Gift cards",
    "commerce/gift-cards",
    "Sell, issue, and manage branded gift cards for your studio.",
  );
}

export default async function StudioGiftCardsPage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login?callbackUrl=/dashboard");

  const { studioId } = await params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, displayName: true, ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== user.id) notFound();

  const [giftCards, templates] = await Promise.all([
    prisma.giftCard.findMany({
      where: { studioId },
      orderBy: { createdAt: "desc" },
      include: {
        template: true,
      },
      take: 50,
    }),
    prisma.giftCardTemplate.findMany({
      where: { studioId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className={ui.overline}>Revenue</p>
        <h1 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Gift cards</h1>
        <p className="mt-2 max-w-2xl text-sm text-[var(--muted)]">
          Create branded studio gift cards, issue them directly, and keep the balance and delivery status visible in one place.
        </p>
      </div>

      <GiftCardsManager
        studioId={studioId}
        studioName={studio.displayName}
        initialGiftCards={giftCards.map((giftCard) => ({
          ...giftCard,
          validUntil: giftCard.validUntil?.toISOString() ?? null,
          sentAt: giftCard.sentAt?.toISOString() ?? null,
        }))}
        initialTemplates={templates}
      />
    </div>
  );
}
