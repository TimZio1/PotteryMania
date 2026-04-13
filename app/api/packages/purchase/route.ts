import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getStripe } from "@/lib/stripe";
import { commissionCentsFromLine, resolveCommissionBps } from "@/lib/commission";
import { studioCanOperateMessage } from "@/lib/studio-operating-gates";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { packageId?: string; startsAt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const packageId = typeof body.packageId === "string" ? body.packageId.trim() : "";
  if (!packageId) return NextResponse.json({ error: "packageId is required" }, { status: 400 });

  const pkg = await prisma.classPackage.findFirst({
    where: {
      id: packageId,
      isActive: true,
      isVisible: true,
      studio: { status: "approved" },
    },
    include: {
      items: {
        include: {
          experience: { select: { id: true, title: true } },
        },
      },
      studio: {
        select: {
          id: true,
          displayName: true,
          stripeAccount: {
            select: {
              stripeAccountId: true,
              chargesEnabled: true,
              payoutsEnabled: true,
            },
          },
        },
      },
    },
  });
  if (!pkg) return NextResponse.json({ error: "Package not available" }, { status: 404 });
  if (pkg.maxSetsForSale != null && pkg.soldCount >= pkg.maxSetsForSale) {
    return NextResponse.json({ error: "This package is sold out" }, { status: 409 });
  }

  const startsAt = typeof body.startsAt === "string" ? new Date(body.startsAt) : new Date();
  if (Number.isNaN(startsAt.getTime())) {
    return NextResponse.json({ error: "Invalid startsAt date" }, { status: 400 });
  }
  const normalizedStartsAt = new Date(startsAt);
  normalizedStartsAt.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (normalizedStartsAt.getTime() < now.getTime()) {
    return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 });
  }

  const stripeRow = pkg.studio.stripeAccount;
  if (!stripeRow?.stripeAccountId || !stripeRow.chargesEnabled || !stripeRow.payoutsEnabled) {
    return NextResponse.json({ error: studioCanOperateMessage() }, { status: 400 });
  }

  const bookingBps = await resolveCommissionBps(pkg.studio.id, "booking");
  const applicationFee = commissionCentsFromLine(pkg.priceCents, bookingBps);
  const startIso = normalizedStartsAt.toISOString();

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    success_url: `${baseUrl()}/my-packages?package_purchase=success`,
    cancel_url: `${baseUrl()}/studios/${pkg.studio.id}/packages?cancelled=1`,
    payment_method_types: ["card"],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: pkg.priceCents,
          product_data: {
            name: pkg.name,
            description: `Class package · valid for ${pkg.validityDays} day${pkg.validityDays === 1 ? "" : "s"}`,
          },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: applicationFee,
      transfer_data: { destination: stripeRow.stripeAccountId },
      metadata: {
        type: "class_package_purchase",
        packageId: pkg.id,
        studioId: pkg.studio.id,
        userId: user.id,
        startsAt: startIso,
      },
    },
    metadata: {
      type: "class_package_purchase",
      packageId: pkg.id,
      studioId: pkg.studio.id,
      userId: user.id,
      startsAt: startIso,
    },
  });

  return NextResponse.json({ url: session.url });
}
