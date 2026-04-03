import { NextResponse } from "next/server";
import { getMarketplaceProduct } from "@/lib/products";

type Ctx = { params: Promise<{ productId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { productId } = await ctx.params;
  const result = await getMarketplaceProduct(productId);
  if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(result);
}