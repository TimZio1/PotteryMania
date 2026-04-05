import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { checkRateLimit } from "@/lib/rate-limit";

function trimOrNull(v: unknown, max: number): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

function normalizeCurrency(v: unknown): string | null {
  const s = trimOrNull(v, 8);
  if (!s) return null;
  const u = s.toUpperCase();
  if (!/^[A-Z]{3}$/.test(u)) return null;
  return u;
}

function normalizeLanguage(v: unknown): string | null {
  const s = trimOrNull(v, 16);
  if (!s) return null;
  if (!/^[a-zA-Z]{2,3}(-[a-zA-Z]{2,4})?$/.test(s)) return null;
  return s;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  let profile = await prisma.customerProfile.findUnique({ where: { userId: user.id } });
  if (!profile) {
    profile = await prisma.customerProfile.create({
      data: { userId: user.id },
    });
  }

  return NextResponse.json({
    email: user.email,
    profile: {
      fullName: profile.fullName,
      phone: profile.phone,
      preferredLanguage: profile.preferredLanguage,
      preferredCurrency: profile.preferredCurrency,
    },
  });
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const rl = checkRateLimit(`me_customer_profile:${user.id}`, 30, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many updates. Try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = trimOrNull(body.fullName, 120);
  const phone = trimOrNull(body.phone, 40);
  const preferredLanguage = normalizeLanguage(body.preferredLanguage);
  const preferredCurrency = normalizeCurrency(body.preferredCurrency);

  if (body.preferredLanguage !== undefined && body.preferredLanguage !== null && body.preferredLanguage !== "") {
    if (preferredLanguage === null && typeof body.preferredLanguage === "string" && body.preferredLanguage.trim()) {
      return NextResponse.json({ error: "Invalid preferred language code" }, { status: 400 });
    }
  }
  if (body.preferredCurrency !== undefined && body.preferredCurrency !== null && body.preferredCurrency !== "") {
    if (preferredCurrency === null && typeof body.preferredCurrency === "string" && body.preferredCurrency.trim()) {
      return NextResponse.json({ error: "Invalid currency (use a 3-letter ISO code, e.g. EUR)" }, { status: 400 });
    }
  }

  const profile = await prisma.customerProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fullName,
      phone,
      preferredLanguage,
      preferredCurrency,
    },
    update: {
      ...(body.fullName !== undefined ? { fullName } : {}),
      ...(body.phone !== undefined ? { phone } : {}),
      ...(body.preferredLanguage !== undefined ? { preferredLanguage } : {}),
      ...(body.preferredCurrency !== undefined ? { preferredCurrency } : {}),
    },
  });

  return NextResponse.json({
    profile: {
      fullName: profile.fullName,
      phone: profile.phone,
      preferredLanguage: profile.preferredLanguage,
      preferredCurrency: profile.preferredCurrency,
    },
  });
}
