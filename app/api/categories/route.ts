import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { slugify } from "@/lib/slug";

export async function GET() {
  const categories = await prisma.productCategory.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
  const slug = slugify(name);
  const exists = await prisma.productCategory.findFirst({
    where: { OR: [{ name }, { slug }] } ,
  });
  if (exists) return NextResponse.json({ error: "Category exists" }, { status: 409 });
  const cat = await prisma.productCategory.create({
    data: { name, slug },
  });
  return NextResponse.json({ category: cat }, { status: 201 });
}