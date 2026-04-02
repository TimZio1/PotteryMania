import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";

export const CART_COOKIE = "pm_cart_id";

export async function getCartForRequest(userId: string | null): Promise<{
  cartId: string;
  setCookie: string | null;
}> {
  const jar = await cookies();
  const raw = jar.get(CART_COOKIE)?.value;

  if (userId) {
    let cart = await prisma.cart.findFirst({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }
    return { cartId: cart.id, setCookie: null };
  }

  if (raw) {
    const byId = await prisma.cart.findFirst({
      where: { id: raw, userId: null },
    });
    if (byId) return { cartId: byId.id, setCookie: null };
  }

  const cart = await prisma.cart.create({
    data: { sessionToken: randomUUID() },
  });
  const setCookie = `${CART_COOKIE}=${cart.id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 90}`;
  return { cartId: cart.id, setCookie };
}

export function withCartCookie(res: Response, setCookie: string | null): Response {
  if (!setCookie) return res;
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", setCookie);
  return new Response(res.body, { status: res.status, headers });
}

export const cartItemInclude = {
  product: {
    include: {
      studio: { select: { id: true, displayName: true, status: true } },
      images: { orderBy: { sortOrder: "asc" as const } },
    },
  },
  experience: {
    include: {
      studio: { select: { id: true, displayName: true, status: true } },
      images: { orderBy: { sortOrder: "asc" as const } },
      cancellationPolicy: true,
    },
  },
  slot: true,
  vendor: { select: { id: true, displayName: true, status: true } },
} satisfies Prisma.CartItemInclude;