import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

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

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const fields = await prisma.studioClientField.findMany({
    where: { studioId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json({ fields });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") return NextResponse.json({ error: "Studio suspended" }, { status: 403 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const fieldType = normalizeFieldType(body.fieldType);
  if (!fieldType) return NextResponse.json({ error: "fieldType is invalid" }, { status: 400 });

  const options =
    fieldType === "dropdown" && Array.isArray(body.options)
      ? [...new Set(body.options.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))]
      : null;
  if (fieldType === "dropdown" && (!options || options.length === 0)) {
    return NextResponse.json({ error: "Dropdown fields need at least one option" }, { status: 400 });
  }

  const field = await prisma.studioClientField.create({
    data: {
      studioId,
      title,
      fieldType: fieldType as
        | "text_single"
        | "text_multi"
        | "number"
        | "checkbox"
        | "dropdown"
        | "date"
        | "file_upload",
      isRequired: body.isRequired === true,
      options: fieldType === "dropdown" ? (options as Prisma.InputJsonValue) : Prisma.JsonNull,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
          ? Math.max(0, Math.floor(body.sortOrder))
          : 0,
    },
  });
  return NextResponse.json({ field }, { status: 201 });
}
