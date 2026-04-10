import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { parseStudioPublicThemeJson } from "@/lib/studio-theme/schema";
import { resolveStudioPublicTheme } from "@/lib/studio-theme/resolve";
import {
  allowedPresetsForTier,
  clampThemePresetForTier,
  studioPublicThemeTierFromStudio,
} from "@/lib/studio-theme/tier";

type Ctx = { params: Promise<{ studioId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, activationPaidAt: true, publicTheme: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const tier = studioPublicThemeTierFromStudio(studio);
  const theme = parseStudioPublicThemeJson(studio.publicTheme);
  const resolved = resolveStudioPublicTheme(studio);
  return NextResponse.json({
    theme,
    resolved: {
      themePreset: resolved.themePreset,
      surfaceClassName: resolved.surfaceClassName,
      cssVariables: resolved.cssVariables,
    },
    tier,
    presetsAllowed: allowedPresetsForTier(tier),
    activationPaidAt: studio.activationPaidAt?.toISOString() ?? null,
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true, activationPaidAt: true, publicTheme: true },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tier = studioPublicThemeTierFromStudio(studio);
  const next = parseStudioPublicThemeJson({ ...parseStudioPublicThemeJson(studio.publicTheme), ...body });
  next.themePreset = clampThemePresetForTier(next.themePreset, tier);

  const updated = await prisma.studio.update({
    where: { id: studioId },
    data: { publicTheme: next as object },
    select: { publicTheme: true, activationPaidAt: true },
  });

  const resolved = resolveStudioPublicTheme(updated);
  return NextResponse.json({
    theme: parseStudioPublicThemeJson(updated.publicTheme),
    resolved: {
      themePreset: resolved.themePreset,
      surfaceClassName: resolved.surfaceClassName,
      cssVariables: resolved.cssVariables,
    },
  });
}
