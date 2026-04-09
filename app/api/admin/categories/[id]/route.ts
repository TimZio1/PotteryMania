import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (typeof body.shortDescription === "string") data.shortDescription = body.shortDescription.trim();
  if (typeof body.longDescription === "string") data.longDescription = body.longDescription.trim();
  if (typeof body.imageUrl === "string") data.imageUrl = body.imageUrl.trim();
  if (typeof body.icon === "string" || body.icon === null) data.icon = typeof body.icon === "string" ? body.icon.trim() || null : null;
  if (typeof body.isActive === "boolean") data.isActive = body.isActive;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No changes" }, { status: 400 });
  }

  const category = await prisma.productCategory.update({
    where: { id },
    data,
  });
  return NextResponse.json({ category });
}
