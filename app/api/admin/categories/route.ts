import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { allCeramicCategories, syncLockedCeramicCategories } from "@/lib/ceramic-categories";

export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await syncLockedCeramicCategories(prisma);
  const categories = await prisma.productCategory.findMany({
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const slug = typeof body.slug === "string" ? body.slug.trim() : "";
  const shortDescription = typeof body.shortDescription === "string" ? body.shortDescription.trim() : "";
  const longDescription = typeof body.longDescription === "string" ? body.longDescription.trim() : "";
  const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
  const icon = typeof body.icon === "string" ? body.icon.trim() : "";

  if (!name || !slug || !shortDescription || !longDescription || !imageUrl) {
    return NextResponse.json({ error: "name, slug, shortDescription, longDescription, imageUrl are required" }, { status: 400 });
  }
  if (!allCeramicCategories().some((c) => c.slug === slug)) {
    return NextResponse.json({ error: "Slug must be one of the 10 locked ceramic categories" }, { status: 400 });
  }

  const created = await prisma.productCategory.create({
    data: {
      name,
      slug,
      shortDescription,
      longDescription,
      imageUrl,
      icon: icon || null,
      isActive: true,
    },
  });
  return NextResponse.json({ category: created }, { status: 201 });
}
