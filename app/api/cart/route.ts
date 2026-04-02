import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { getCartForRequest, withCartCookie, cartItemInclude } from "@/lib/cart-server";

async function loadCart(cartId: string) {
  return prisma.cart.findUnique({
    where: { id: cartId },
    include: {
      items: {
        include: cartItemInclude,
      },
    },
  });
}

export async function GET() {
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);
  const cart = await loadCart(cartId);
  if (!cart) {
    return NextResponse.json({ error: "Cart missing" }, { status: 400 });
  }
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);

  let body: { productId?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const productId = typeof body.productId === "string" ? body.productId : "";
  const quantity = typeof body.quantity === "number" && body.quantity > 0 ? Math.floor(body.quantity) : 1;
  if (!productId) return NextResponse.json({ error: "productId required" }, { status: 400 });

  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      status: "active",
      studio: { status: "approved" },
    },
  });
  if (!product) return NextResponse.json({ error: "Product not available" }, { status: 400 });

  const unit = product.salePriceCents ?? product.priceCents;
  const existingItems = await prisma.cartItem.findMany({
    where: { cartId },
    include: { product: true },
  });
  const otherVendor = existingItems.find((i) => i.vendorId !== product.studioId);
  if (otherVendor) {
    return NextResponse.json(
      { error: "Cart can only contain products from one studio. Clear cart first." },
      { status: 400 }
    );
  }

  const same = existingItems.find((i) => i.productId === productId);
  if (same) {
    await prisma.cartItem.update({
      where: { id: same.id },
      data: { quantity: same.quantity + quantity, priceSnapshotCents: unit },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        itemType: "product",
        productId,
        vendorId: product.studioId,
        quantity,
        priceSnapshotCents: unit,
      },
    });
  }

  const cart = await loadCart(cartId);
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);

  let body: { itemId?: string; quantity?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const itemId = typeof body.itemId === "string" ? body.itemId : "";
  const quantity = typeof body.quantity === "number" ? Math.floor(body.quantity) : 0;
  if (!itemId) return NextResponse.json({ error: "itemId required" }, { status: 400 });

  const item = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
  } else {
    await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  const cart = await loadCart(cartId);
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}

export async function DELETE() {
  const user = await getSessionUser();
  const { cartId, setCookie } = await getCartForRequest(user?.id ?? null);
  await prisma.cartItem.deleteMany({ where: { cartId } });
  const cart = await loadCart(cartId);
  const res = NextResponse.json({ cart });
  return withCartCookie(res, setCookie);
}