import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true, ownerUserId: true, status: true },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

function normalizeFieldType(raw: unknown) {
  if (typeof raw !== "string") return null;
  const allowed = new Set(["text_single", "text_multi", "number", "checkbox", "dropdown", "date", "file_upload"]);
  return allowed.has(raw) ? raw : null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.studioClientField.findFirst({
    where: { id, studioId },
    select: { id: true, fieldType: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: Prisma.StudioClientFieldUpdateInput = {};

  const nextFieldType = "fieldType" in body ? normalizeFieldType(body.fieldType) : existing.fieldType;
  if ("fieldType" in body && !nextFieldType) return NextResponse.json({ error: "fieldType is invalid" }, { status: 400 });

  if ("title" in body) {
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    data.title = title;
  }
  if ("fieldType" in body && nextFieldType) {
    data.fieldType = nextFieldType as
      | "text_single"
      | "text_multi"
      | "number"
      | "checkbox"
      | "dropdown"
      | "date"
      | "file_upload";
  }
  if ("isRequired" in body) data.isRequired = body.isRequired === true;
  if ("sortOrder" in body) {
    const sortOrder = typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder) ? Math.max(0, Math.floor(body.sortOrder)) : NaN;
    if (!Number.isFinite(sortOrder)) return NextResponse.json({ error: "sortOrder must be a number" }, { status: 400 });
    data.sortOrder = sortOrder;
  }
  if ("options" in body || nextFieldType === "dropdown") {
    const options = Array.isArray(body.options)
      ? [...new Set(body.options.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))]
      : null;
    if (nextFieldType === "dropdown" && (!options || options.length === 0)) {
      return NextResponse.json({ error: "Dropdown fields need at least one option" }, { status: 400 });
    }
    if (nextFieldType === "dropdown") {
      data.options = options as Prisma.InputJsonValue;
    } else {
      data.options = Prisma.JsonNull;
    }
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "No updates provided" }, { status: 400 });

  const field = await prisma.studioClientField.update({
    where: { id },
    data,
  });
  return NextResponse.json({ field });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId, id } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  const existing = await prisma.studioClientField.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studioClientField.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
