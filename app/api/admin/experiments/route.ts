import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function GET() {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await prisma.experiment.findMany({ orderBy: { updatedAt: "desc" } });
  return NextResponse.json({
    experiments: rows.map((e) => ({
      id: e.id,
      slug: e.slug,
      name: e.name,
      isActive: e.isActive,
      variantBPercent: e.variantBPercent,
      updatedAt: e.updatedAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { slug?: string; name?: string; variantBPercent?: number; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slug = typeof body.slug === "string" ? body.slug.trim().toLowerCase() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  const variantBPercent =
    typeof body.variantBPercent === "number" && Number.isFinite(body.variantBPercent)
      ? Math.min(100, Math.max(0, Math.floor(body.variantBPercent)))
      : 50;

  if (!SLUG_RE.test(slug) || name.length < 2 || reason.length < 3) {
    return NextResponse.json({ error: "slug (kebab-case), name, reason (min 3) required" }, { status: 400 });
  }

  const row = await prisma.experiment.create({
    data: { slug, name, variantBPercent, isActive: true },
  });

  await logAdminAction({
    actorUserId: user.id,
    action: "experiment.create",
    entityType: "experiment",
    entityId: row.id,
    after: { slug, name, variantBPercent },
    reason,
  });

  return NextResponse.json({ id: row.id });
}
