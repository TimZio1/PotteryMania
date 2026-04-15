import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio) return NextResponse.json({ error: "Studio not found" }, { status: 404 });
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
    where: { id, studioId, isActive: true },
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
