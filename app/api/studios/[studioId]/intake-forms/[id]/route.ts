import { NextResponse } from "next/server";
import { IntakeFieldType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireStudioOwner } from "@/lib/studio-api-auth";

type Ctx = { params: Promise<{ studioId: string; id: string }> };

function normalizeOptions(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const options = raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
  return options.length ? options : null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { status: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  const existing = await prisma.intakeForm.findFirst({
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

  const data: Prisma.IntakeFormUpdateInput = {};
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title) return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
    data.title = title;
  }

  const validFieldTypes = new Set<IntakeFieldType>([
    "text_single",
    "text_multi",
    "number",
    "checkbox",
    "dropdown",
    "date",
    "file_upload",
  ]);
  const rawFieldType = typeof body.fieldType === "string" ? body.fieldType.trim() : null;
  const parsedFieldType =
    rawFieldType && validFieldTypes.has(rawFieldType as IntakeFieldType)
      ? (rawFieldType as IntakeFieldType)
      : null;
  const nextFieldType =
    parsedFieldType ?? existing.fieldType;
  if (rawFieldType !== null) {
    if (!parsedFieldType) {
      return NextResponse.json({ error: "Invalid fieldType" }, { status: 400 });
    }
    data.fieldType = nextFieldType;
  }

  if (body.isRequired === true || body.isRequired === false) data.isRequired = body.isRequired;
  if (body.includeInInvoice === true || body.includeInInvoice === false) {
    data.includeInInvoice = body.includeInInvoice;
  }
  if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
    data.sortOrder = Math.max(0, Math.floor(body.sortOrder));
  }
  if ("options" in body) {
    const options = normalizeOptions(body.options);
    if (nextFieldType === "dropdown" && (!options || options.length < 1)) {
      return NextResponse.json({ error: "Dropdown questions require at least one option" }, { status: 400 });
    }
    data.options = options ?? Prisma.DbNull;
  } else if (nextFieldType !== "dropdown") {
    data.options = Prisma.DbNull;
  }

  const form = await prisma.intakeForm.update({
    where: { id },
    data,
    include: {
      experiences: {
        select: {
          experienceId: true,
          experience: { select: { title: true } },
        },
      },
    },
  });

  return NextResponse.json({
    form: {
      ...form,
      experienceIds: form.experiences.map((link) => link.experienceId),
      linkedExperiences: form.experiences.map((link) => ({
        id: link.experienceId,
        title: link.experience.title,
      })),
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const { studioId, id } = await ctx.params;
  const auth = await requireStudioOwner(studioId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.intakeForm.findFirst({
    where: { id, studioId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.intakeForm.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
