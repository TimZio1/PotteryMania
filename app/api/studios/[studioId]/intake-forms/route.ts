import { NextResponse } from "next/server";
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

function normalizeExperienceIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean))];
}

function normalizeOptions(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const options = raw.map((value) => (typeof value === "string" ? value.trim() : "")).filter(Boolean);
  return options.length ? options : null;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const forms = await prisma.intakeForm.findMany({
    where: { studioId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
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
    forms: forms.map((form) => ({
      ...form,
      experienceIds: form.experiences.map((link) => link.experienceId),
      linkedExperiences: form.experiences.map((link) => ({
        id: link.experienceId,
        title: link.experience.title,
      })),
    })),
  });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (studio.status === "suspended") {
    return NextResponse.json({ error: "Studio suspended" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const fieldType = typeof body.fieldType === "string" ? body.fieldType.trim() : "";
  const validFieldTypes = new Set(["text_single", "text_multi", "number", "checkbox", "dropdown", "date", "file_upload"]);

  if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });
  if (!validFieldTypes.has(fieldType)) {
    return NextResponse.json({ error: "Valid fieldType is required" }, { status: 400 });
  }

  const options = normalizeOptions(body.options);
  if (fieldType === "dropdown" && (!options || options.length < 1)) {
    return NextResponse.json({ error: "Dropdown questions require at least one option" }, { status: 400 });
  }

  const experienceIds = normalizeExperienceIds(body.experienceIds);
  if (experienceIds.length > 0) {
    const count = await prisma.experience.count({
      where: { id: { in: experienceIds }, studioId },
    });
    if (count !== experienceIds.length) {
      return NextResponse.json({ error: "One or more linked classes are invalid" }, { status: 400 });
    }
  }

  const form = await prisma.intakeForm.create({
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
      includeInInvoice: body.includeInInvoice === true,
      sortOrder:
        typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)
          ? Math.max(0, Math.floor(body.sortOrder))
          : 0,
      options: options ?? undefined,
      ...(experienceIds.length > 0
        ? {
            experiences: {
              createMany: {
                data: experienceIds.map((experienceId) => ({ experienceId })),
              },
            },
          }
        : {}),
    },
    include: {
      experiences: {
        select: {
          experienceId: true,
          experience: { select: { title: true } },
        },
      },
    },
  });

  return NextResponse.json(
    {
      form: {
        ...form,
        experienceIds: form.experiences.map((link) => link.experienceId),
        linkedExperiences: form.experiences.map((link) => ({
          id: link.experienceId,
          title: link.experience.title,
        })),
      },
    },
    { status: 201 },
  );
}
