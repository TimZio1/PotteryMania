import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { studioId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const studioId = typeof body.studioId === "string" ? body.studioId.trim() : "";
  if (!studioId) return NextResponse.json({ error: "studioId required" }, { status: 400 });

  const studio = await prisma.studio.findFirst({
    where: { id: studioId, ownerUserId: user.id },
    select: { id: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.calendarConnection.updateMany({
    where: { studioId, provider: "google" },
    data: {
      connectionStatus: "disconnected",
      accessToken: null,
      refreshToken: null,
      tokenExpiresAt: null,
      syncErrorState: null,
      lastSyncAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
