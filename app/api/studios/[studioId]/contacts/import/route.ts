import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { normalizeStudentEmail } from "@/lib/studio-student-crm";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { ownerUserId: true },
  });
  if (!studio || studio.ownerUserId !== userId) return false;
  return true;
}

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  const rows: string[][] = [];
  for (const line of lines) {
    rows.push(line.split(",").map((v) => v.trim()));
  }
  return rows;
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  if (!(await assertOwner(studioId, user.id))) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { csv?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const csv = typeof body.csv === "string" ? body.csv : "";
  if (!csv.trim()) return NextResponse.json({ error: "csv required" }, { status: 400 });

  const rows = parseCsv(csv);
  if (rows.length === 0) return NextResponse.json({ imported: 0, skipped: 0 });
  const header = rows[0].map((h) => h.toLowerCase());
  const idxEmail = header.indexOf("email");
  const idxName = header.indexOf("name");
  const idxPhone = header.indexOf("phone");
  const idxNotes = header.indexOf("notes");
  const idxTags = header.indexOf("tags");
  if (idxEmail < 0) return NextResponse.json({ error: "CSV must include an email column" }, { status: 400 });

  let imported = 0;
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const emailNormalized = normalizeStudentEmail(row[idxEmail] ?? "");
    if (!emailNormalized || !emailNormalized.includes("@")) {
      skipped += 1;
      continue;
    }
    const displayName = (idxName >= 0 ? row[idxName] : "")?.trim() || emailNormalized.split("@")[0] || "Guest";
    const tags =
      idxTags >= 0
        ? (row[idxTags] ?? "")
            .split(/[;|]/)
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 20)
        : [];
    await prisma.studioContact.upsert({
      where: { studioId_emailNormalized: { studioId, emailNormalized } },
      create: {
        studioId,
        emailNormalized,
        displayName,
        phone: idxPhone >= 0 ? (row[idxPhone] ?? "").trim() || null : null,
        notes: idxNotes >= 0 ? (row[idxNotes] ?? "").trim() || null : null,
        tags,
      },
      update: {
        displayName,
        phone: idxPhone >= 0 ? (row[idxPhone] ?? "").trim() || null : undefined,
        notes: idxNotes >= 0 ? (row[idxNotes] ?? "").trim() || null : undefined,
        tags,
      },
    });
    imported += 1;
  }
  return NextResponse.json({ imported, skipped });
}
