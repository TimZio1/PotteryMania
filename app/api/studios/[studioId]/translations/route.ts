import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const translations = await prisma.studioTranslation.findMany({
    where: { studioId },
    orderBy: { languageCode: "asc" },
  });
  return NextResponse.json({ translations });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: {
    languageCode?: string;
    displayName?: string;
    shortDescription?: string | null;
    longDescription?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const languageCode = typeof body.languageCode === "string" ? body.languageCode.trim().toLowerCase() : "";
  const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
  if (!languageCode || !/^[a-z]{2}(-[a-z0-9]{2,8})?$/.test(languageCode)) {
    return NextResponse.json({ error: "Invalid languageCode." }, { status: 400 });
  }
  if (!displayName) {
    return NextResponse.json({ error: "displayName required." }, { status: 400 });
  }

  const translation = await prisma.studioTranslation.upsert({
    where: { studioId_languageCode: { studioId, languageCode } },
    create: {
      studioId,
      languageCode,
      displayName,
      shortDescription: body.shortDescription?.trim() || null,
      longDescription: body.longDescription?.trim() || null,
    },
    update: {
      displayName,
      shortDescription: body.shortDescription?.trim() || null,
      longDescription: body.longDescription?.trim() || null,
    },
  });
  return NextResponse.json({ translation });
}
