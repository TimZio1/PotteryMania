import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { normalizeWearAffiliateCode } from "@/lib/wear-affiliate-code";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function cleanString(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value: unknown) {
  return cleanString(value, 254).toLowerCase();
}

function parseMarginBps(value: unknown) {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number.parseFloat(value)
        : Number.NaN;
  if (!Number.isFinite(n)) return 1000;
  return Math.max(0, Math.min(5000, Math.round(n * 100)));
}

function baseUrl() {
  return process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
}

export async function POST(req: Request) {
  const actor = await requireAdminUser();
  if (!actor) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { name?: unknown; email?: unknown; code?: unknown; marginPercent?: unknown; enabled?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = cleanString(body.name, 120);
  const email = cleanEmail(body.email);
  const code = normalizeWearAffiliateCode(cleanString(body.code, 64));
  const marginBps = parseMarginBps(body.marginPercent);
  const enabled = body.enabled !== false;

  if (name.length < 2) return NextResponse.json({ error: "Affiliate name is required." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Valid affiliate email is required." }, { status: 400 });
  }
  if (!code) {
    return NextResponse.json(
      { error: "Valid affiliate code required: 3-32 lowercase letters, numbers, or single hyphens." },
      { status: 400 },
    );
  }

  const existingCode = await prisma.studioWearConfig.findUnique({
    where: { wearAffiliateCode: code },
    select: { studioId: true },
  });
  if (existingCode) return NextResponse.json({ error: "That affiliate code is already in use." }, { status: 409 });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.upsert({
      where: { email },
      create: { email, role: "customer", emailVerifiedAt: null },
      update: {},
      select: { id: true, email: true },
    });

    const studio = await tx.studio.create({
      data: {
        ownerUserId: user.id,
        displayName: name,
        legalBusinessName: name,
        vatNumber: "N/A",
        responsiblePersonName: name,
        email,
        country: "N/A",
        city: "N/A",
        addressLine1: "Affiliate partner",
        status: "approved",
        approvedAt: new Date(),
        shortDescription: "PotteryMania apparel affiliate.",
      },
      select: { id: true, displayName: true, email: true },
    });

    const config = await tx.studioWearConfig.create({
      data: {
        studioId: studio.id,
        enabled,
        marginBps,
        marginLocked: true,
        wearAffiliateCode: code,
      },
      select: { studioId: true, enabled: true, marginBps: true, wearAffiliateCode: true },
    });

    return { studio, config };
  });

  const stripe = getStripe();
  const account = await stripe.accounts.create({
    type: "express",
    email,
    capabilities: {
      transfers: { requested: true },
    },
    metadata: {
      type: "wear_affiliate",
      studioId: result.studio.id,
    },
  });
  await prisma.stripeAccount.create({
    data: {
      studioId: result.studio.id,
      stripeAccountId: account.id,
      onboardingStatus: "pending",
    },
  });
  const onboarding = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${baseUrl()}/wear/partner/apply?stripe=refresh`,
    return_url: `${baseUrl()}/wear/partner/apply?stripe=done`,
    type: "account_onboarding",
  });

  await logAdminAction({
    actorUserId: actor.id,
    action: "affiliate.create",
    entityType: "studio_wear_config",
    entityId: result.config.studioId,
    after: {
      name,
      email,
      code: result.config.wearAffiliateCode,
      enabled: result.config.enabled,
      marginBps: result.config.marginBps,
    },
  });

  return NextResponse.json({ ok: true, affiliate: result, stripeOnboardingUrl: onboarding.url });
}
