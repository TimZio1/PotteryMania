import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncLockedCeramicCategories } from "@/lib/ceramic-categories";

export async function GET() {
  try {
    await syncLockedCeramicCategories(prisma);
    const categories = await prisma.productCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        shortDescription: true,
        longDescription: true,
        imageUrl: true,
        icon: true,
      },
    });
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}