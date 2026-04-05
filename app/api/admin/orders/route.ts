import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/auth-session";
import { findAdminOrdersForList } from "@/lib/admin-orders-query";

export async function GET(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const studioId = searchParams.get("studioId");
  const status = searchParams.get("status");
  const orders = await findAdminOrdersForList({ studioId, status, take: 100 });
  return NextResponse.json({ orders });
}