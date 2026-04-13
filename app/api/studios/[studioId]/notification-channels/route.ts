import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";

type Ctx = { params: Promise<{ studioId: string }> };

async function assertOwner(studioId: string, userId: string) {
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      id: true,
      ownerUserId: true,
      status: true,
      smsEnabled: true,
      twilioAccountSid: true,
      twilioPhoneNumber: true,
      whatsappNotificationsEnabled: true,
      whatsappNumber: true,
    },
  });
  if (!studio || studio.ownerUserId !== userId) return null;
  return studio;
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await assertOwner(studioId, user.id);
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    smsEnabled: studio.smsEnabled,
    twilioAccountSid: studio.twilioAccountSid ?? "",
    twilioPhoneNumber: studio.twilioPhoneNumber ?? "",
    whatsappNotificationsEnabled: studio.whatsappNotificationsEnabled,
    whatsappNumber: studio.whatsappNumber ?? "",
  });
}

export async function PATCH(req: Request, ctx: Ctx) {
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

  const data: {
    smsEnabled?: boolean;
    twilioAccountSid?: string | null;
    twilioAuthToken?: string | null;
    twilioPhoneNumber?: string | null;
    whatsappNotificationsEnabled?: boolean;
    whatsappNumber?: string | null;
  } = {};

  if ("smsEnabled" in body) data.smsEnabled = body.smsEnabled === true;
  if ("twilioAccountSid" in body) data.twilioAccountSid = typeof body.twilioAccountSid === "string" ? body.twilioAccountSid.trim() || null : null;
  if ("twilioAuthToken" in body) data.twilioAuthToken = typeof body.twilioAuthToken === "string" ? body.twilioAuthToken.trim() || null : null;
  if ("twilioPhoneNumber" in body) data.twilioPhoneNumber = typeof body.twilioPhoneNumber === "string" ? body.twilioPhoneNumber.trim() || null : null;
  if ("whatsappNotificationsEnabled" in body) data.whatsappNotificationsEnabled = body.whatsappNotificationsEnabled === true;
  if ("whatsappNumber" in body) data.whatsappNumber = typeof body.whatsappNumber === "string" ? body.whatsappNumber.trim() || null : null;

  const updated = await prisma.studio.update({
    where: { id: studioId },
    data,
    select: {
      smsEnabled: true,
      twilioAccountSid: true,
      twilioPhoneNumber: true,
      whatsappNotificationsEnabled: true,
      whatsappNumber: true,
    },
  });

  return NextResponse.json({
    smsEnabled: updated.smsEnabled,
    twilioAccountSid: updated.twilioAccountSid ?? "",
    twilioPhoneNumber: updated.twilioPhoneNumber ?? "",
    whatsappNotificationsEnabled: updated.whatsappNotificationsEnabled,
    whatsappNumber: updated.whatsappNumber ?? "",
  });
}
