import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { buildStudentCrmRows, normalizeStudentEmail, parseTagsInput } from "@/lib/studio-student-crm";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function GET(_req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const students = await buildStudentCrmRows(prisma, studioId);
  return NextResponse.json({ students });
}

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: {
    email?: string;
    displayName?: string;
    phone?: string;
    notes?: string;
    tags?: string | string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const emailRaw = typeof body.email === "string" ? body.email : "";
  const emailNormalized = normalizeStudentEmail(emailRaw);
  if (!emailNormalized || !emailRaw.includes("@")) {
    return NextResponse.json({ error: "Valid email required" }, { status: 400 });
  }

  const displayName =
    typeof body.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim()
      : emailNormalized.split("@")[0] ?? "Guest";

  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  const tags =
    Array.isArray(body.tags) ? body.tags.map(String).filter(Boolean).slice(0, 20) : parseTagsInput(String(body.tags ?? ""));

  const row = await prisma.studioContact.upsert({
    where: {
      studioId_emailNormalized: { studioId, emailNormalized },
    },
    create: {
      studioId,
      emailNormalized,
      displayName,
      phone,
      notes,
      tags,
    },
    update: {
      displayName,
      ...(phone !== undefined ? { phone } : {}),
      ...(notes !== undefined ? { notes } : {}),
      tags,
    },
  });

  return NextResponse.json({ contact: row });
}
