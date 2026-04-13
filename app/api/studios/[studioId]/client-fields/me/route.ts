import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

type FieldType = "text_single" | "text_multi" | "number" | "checkbox" | "dropdown" | "date" | "file_upload";

function normalizeFieldValue(fieldType: FieldType, value: unknown): string {
  if (fieldType === "checkbox") return value === true ? "true" : "false";
  if (typeof value === "string") return value.trim();
  return "";
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;

  const fields = await prisma.studioClientField.findMany({
    where: { studioId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      responses: {
        where: { userId: user.id },
        select: { id: true, value: true },
        take: 1,
      },
    },
  });

  return NextResponse.json({
    fields: fields.map((field) => ({
      id: field.id,
      title: field.title,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      options: field.options,
      sortOrder: field.sortOrder,
      value: field.responses[0]?.value ?? "",
    })),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!Array.isArray(body.responses)) {
    return NextResponse.json({ error: "responses array is required" }, { status: 400 });
  }

  const fields = await prisma.studioClientField.findMany({
    where: { studioId },
    select: { id: true, fieldType: true, isRequired: true, options: true },
  });
  const fieldById = new Map(fields.map((field) => [field.id, field]));

  const normalized: { fieldId: string; value: string }[] = [];
  for (const row of body.responses as unknown[]) {
    if (!row || typeof row !== "object") continue;
    const fieldId = typeof (row as { fieldId?: unknown }).fieldId === "string" ? (row as { fieldId: string }).fieldId : "";
    const field = fieldById.get(fieldId);
    if (!field) continue;

    const raw = (row as { value?: unknown }).value;
    const value = normalizeFieldValue(field.fieldType as FieldType, raw);
    if (field.isRequired && !value) {
      return NextResponse.json({ error: `Missing required field: ${fieldId}` }, { status: 400 });
    }
    if (field.fieldType === "dropdown" && value) {
      const options = Array.isArray(field.options) ? field.options.filter((entry): entry is string => typeof entry === "string") : [];
      if (!options.includes(value)) {
        return NextResponse.json({ error: `Invalid option for field: ${fieldId}` }, { status: 400 });
      }
    }
    normalized.push({ fieldId, value });
  }

  await prisma.$transaction(
    normalized.map((entry) =>
      prisma.studioClientFieldResponse.upsert({
        where: { fieldId_userId: { fieldId: entry.fieldId, userId: user.id } },
        create: {
          fieldId: entry.fieldId,
          userId: user.id,
          value: entry.value,
        },
        update: {
          value: entry.value,
        },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
