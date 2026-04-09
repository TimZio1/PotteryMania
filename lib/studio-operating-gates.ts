import type { Prisma } from "@prisma/client";

export function studioCanOperateWhere(): Prisma.StudioWhereInput {
  return {
    status: "approved",
    stripeAccount: {
      is: {
        chargesEnabled: true,
        payoutsEnabled: true,
      },
    },
  };
}

export function studioCanOperateMessage(): string {
  return "Studio must connect Stripe (charges + payouts enabled) to use shop, bookings, and payments.";
}
