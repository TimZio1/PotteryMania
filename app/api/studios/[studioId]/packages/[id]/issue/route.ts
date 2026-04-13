import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id: packageId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  let body: { customerEmail?: string; startsAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail.trim().toLowerCase() : "";
  if (!customerEmail) return NextResponse.json({ error: "customerEmail is required" }, { status: 400 });

  const customer = await prisma.user.findUnique({
    where: { email: customerEmail },
    select: { id: true },
  });
  if (!customer) return NextResponse.json({ error: "Customer account not found for this email" }, { status: 404 });

  const pkg = await prisma.classPackage.findFirst({
    where: { id: packageId, studioId, isActive: true },
    include: { items: { select: { quantity: true } } },
  });
  if (!pkg) return NextResponse.json({ error: "Package not found" }, { status: 404 });

  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) return NextResponse.json({ error: "Invalid startsAt date" }, { status: 400 });

  const creditsTotal = pkg.generalItemLimit ?? pkg.items.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
  const expiresAt = new Date(startsAt.getTime() + pkg.validityDays * 24 * 60 * 60 * 1000);

  const purchase = await prisma.$transaction(async (tx) => {
    if (pkg.maxSetsForSale != null && pkg.soldCount >= pkg.maxSetsForSale) {
      throw new Error("PACKAGE_SOLD_OUT");
    }
    const created = await tx.classPackagePurchase.create({
      data: {
        packageId: pkg.id,
        userId: customer.id,
        startsAt,
        expiresAt,
        creditsTotal,
        paidCents: 0,
        status: "active",
      },
      include: {
        package: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
      },
    });
    await tx.classPackage.update({
      where: { id: pkg.id },
      data: { soldCount: { increment: 1 } },
    });
    return created;
  }).catch((error) => {
    if (error instanceof Error && error.message === "PACKAGE_SOLD_OUT") return null;
    throw error;
  });

  if (!purchase) return NextResponse.json({ error: "Package is sold out" }, { status: 409 });
  return NextResponse.json({ purchase }, { status: 201 });
}
