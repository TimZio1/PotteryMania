import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { abandonedCartCopy, sendOrderEmails } from "@/lib/email/order-notify";

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cutoff = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const carts = await prisma.cart.findMany({
    where: {
      updatedAt: { lt: cutoff },
      lastRecoveryEmailSentAt: null,
      user: { email: { not: "" } },
      items: { some: {} },
    },
    include: {
      user: true,
      items: true,
    },
    take: 100,
  });

  let sent = 0;
  for (const cart of carts) {
    if (!cart.user?.email) continue;
    await sendOrderEmails({
      customerEmail: cart.user.email,
      subject: "Complete your PotteryMania order",
      customerHtml: abandonedCartCopy({ recoveryUrl: `${baseUrl()}/cart`, itemCount: cart.items.length }),
    });
    await prisma.cart.update({
      where: { id: cart.id },
      data: { lastRecoveryEmailSentAt: new Date() },
    });
    sent += 1;
  }

  return NextResponse.json({ ok: true, sent });
}
