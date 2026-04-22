import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdminUser } from "@/lib/auth-session";
import { isFeatureSuggestionStatus } from "@/lib/feature-suggestions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const status = (payload as { status?: unknown } | null)?.status;
  if (!isFeatureSuggestionStatus(status)) {
    return NextResponse.json({ error: "Unknown status." }, { status: 400 });
  }

  try {
    await prisma.featureSuggestion.update({
      where: { id },
      data: { status },
    });
  } catch {
    return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, status });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const user = await requireAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  try {
    await prisma.featureSuggestion.delete({ where: { id } });
  } catch {
    return NextResponse.json({ error: "Suggestion not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
