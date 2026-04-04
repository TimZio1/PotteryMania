import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { checkRateLimit, getClientKey } from "@/lib/rate-limit";
import { hasStudioFeature } from "@/lib/studio-features";
import { buildStudioAdvisorSystemPrompt, completeStudioAdvisorChat } from "@/lib/openai-studio-advisor";

export const dynamic = "force-dynamic";

const MAX_MESSAGE = 6000;

type Ctx = { params: Promise<{ studioId: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { studioId } = await ctx.params;
  const rate = checkRateLimit(`studio-ai:${studioId}:${getClientKey(req)}`, 20, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many requests — try again shortly." }, { status: 429 });
  }

  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: {
      id: true,
      ownerUserId: true,
      displayName: true,
      city: true,
      country: true,
    },
  });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!(await hasStudioFeature(studioId, "ai_advisor"))) {
    return NextResponse.json(
      { error: "AI Advisor is not enabled for this studio. Turn it on under Features / Add-ons." },
      { status: 403 },
    );
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return NextResponse.json({ error: "AI is not configured on the server." }, { status: 503 });
  }

  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message.length) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  const since = new Date();
  since.setUTCDate(since.getUTCDate() - 90);

  const [activeExperiences, activeProducts, bookingsConfirmedOrPending, bookingsCompletedLast90d] = await Promise.all([
    prisma.experience.count({ where: { studioId, status: "active" } }),
    prisma.product.count({ where: { studioId, status: "active" } }),
    prisma.booking.count({
      where: {
        studioId,
        bookingStatus: { in: ["pending", "awaiting_vendor_approval", "confirmed"] },
      },
    }),
    prisma.booking.count({
      where: {
        studioId,
        bookingStatus: "completed",
        updatedAt: { gte: since },
      },
    }),
  ]);

  const systemPrompt = buildStudioAdvisorSystemPrompt({
    displayName: studio.displayName,
    city: studio.city,
    country: studio.country,
    activeExperiences,
    activeProducts,
    bookingsConfirmedOrPending,
    bookingsCompletedLast90d,
  });

  try {
    const reply = await completeStudioAdvisorChat(systemPrompt, message);
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("[studio-ai-chat]", e);
    return NextResponse.json({ error: "Could not get a response from the model." }, { status: 502 });
  }
}
