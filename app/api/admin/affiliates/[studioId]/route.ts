import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeWearAffiliateCode } from "@/lib/wear-affiliate-code";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

function cleanString(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function parseMarginBps(value: unknown) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(5000, Math.round(n * 100)));
}

export async function PATCH(req: Request, ctx: Ctx) {
  const actor = await requireAdminUser();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { studioId } = await ctx.params;
  let body: {
    name?: unknown;
    email?: unknown;
    code?: unknown;
    marginPercent?: unknown;
    enabled?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const before = await prisma.studioWearConfig.findUnique({
    where: { studioId },
    include: { studio: { select: { displayName: true, email: true } } },
  });
  if (!before) return NextResponse.json({ error: "Affiliate not found." }, { status: 404 });

  const name = body.name === undefined ? undefined : cleanString(body.name, 120);
  const email = body.email === undefined ? undefined : cleanString(body.email, 254).toLowerCase();
  const code =
    body.code === undefined
      ? undefined
      : body.code === null || cleanString(body.code, 64) === ""
        ? null
        : normalizeWearAffiliateCode(cleanString(body.code, 64));
  const marginBps = body.marginPercent === undefined ? undefined : parseMarginBps(body.marginPercent);

  if (name !== undefined && name.length < 2) {
    return NextResponse.json({ error: "Affiliate name is required." }, { status: 400 });
  }
  if (email !== undefined && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid affiliate email is required." }, { status: 400 });
  }
  if (body.code !== undefined && code === undefined) {
    return NextResponse.json({ error: "Invalid affiliate code." }, { status: 400 });
  }
  if (body.marginPercent !== undefined && marginBps == null) {
    return NextResponse.json({ error: "Valid commission percent is required." }, { status: 400 });
  }
  if (code) {
    const taken = await prisma.studioWearConfig.findFirst({
      where: { wearAffiliateCode: code, NOT: { studioId } },
      select: { studioId: true },
    });
    if (taken) return NextResponse.json({ error: "That affiliate code is already in use." }, { status: 409 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (name !== undefined || email !== undefined) {
      await tx.studio.update({
        where: { id: studioId },
        data: {
          ...(name !== undefined
            ? {
                displayName: name,
                legalBusinessName: name,
                responsiblePersonName: name,
              }
            : {}),
          ...(email !== undefined ? { email } : {}),
        },
      });
    }

    return tx.studioWearConfig.update({
      where: { studioId },
      data: {
        ...(typeof body.enabled === "boolean" ? { enabled: body.enabled } : {}),
        ...(marginBps !== undefined && marginBps !== null ? { marginBps } : {}),
        ...(code !== undefined ? { wearAffiliateCode: code } : {}),
      },
      include: { studio: { select: { displayName: true, email: true } } },
    });
  });

  await logAdminAction({
    actorUserId: actor.id,
    action: "affiliate.update",
    entityType: "studio_wear_config",
    entityId: studioId,
    before: {
      name: before.studio.displayName,
      email: before.studio.email,
      code: before.wearAffiliateCode,
      enabled: before.enabled,
      marginBps: before.marginBps,
    },
    after: {
      name: updated.studio.displayName,
      email: updated.studio.email,
      code: updated.wearAffiliateCode,
      enabled: updated.enabled,
      marginBps: updated.marginBps,
    },
  });

  return NextResponse.json({ ok: true });
}
