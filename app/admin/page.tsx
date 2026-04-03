import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSessionUser, isAdminRole } from "@/lib/auth-session";
import { AdminStudios } from "./admin-studios";
import { AdminBookings } from "./admin-bookings";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user || !isAdminRole(user.role)) {
    redirect("/");
  }
  const pending = await prisma.studio.findMany({
    where: { status: "pending_review" },
    orderBy: { updatedAt: "asc" },
    include: { owner: { select: { email: true } } },
  });
  const commission = await prisma.commissionRule.findFirst({
    where: { ruleScope: "global", studioId: null, itemType: "product", isActive: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight text-amber-950">Operations</h1>
      <p className="mt-2 text-sm text-stone-600">
        Global product commission: {commission ? `${commission.percentageBasisPoints / 100}%` : "default 10% (1000 bps)"}
      </p>
      <AdminStudios initialStudios={pending} />
      <AdminBookings />
    </div>
  );
}