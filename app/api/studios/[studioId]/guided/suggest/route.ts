import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-session";
import { prisma } from "@/lib/db";

type Ctx = { params: Promise<{ studioId: string }> };

/**
 * Plain-language copy suggestions for guided flows (no jargon).
 * Uses OpenAI when configured; otherwise returns a simple template.
 */
export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findUnique({ where: { id: studioId } });
  if (!studio || studio.ownerUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: { kind?: string; title?: string; categoryLabel?: string; studioName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = body.kind === "welcome" ? "welcome" : body.kind === "product" ? "product" : null;
  if (!kind) return NextResponse.json({ error: "kind must be welcome or product" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const studioName = (body.studioName || studio.displayName || "Studio").trim();
  const title = (body.title || "").trim();
  const categoryLabel = (body.categoryLabel || "").trim();

  const prompt =
    kind === "welcome"
      ? `Write ONE short welcoming sentence (max 22 words) for a pottery studio's public page. Studio name: ${studioName}. Friendly, no jargon, no quotes. Plain text only.`
      : `Write ONE short product line for shoppers (max 18 words). Product: "${title}". Type: ${categoryLabel || "handmade ceramics"}. No price, no jargon, no quotes. Plain text only.`;

  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.5,
          max_tokens: 120,
          messages: [
            {
              role: "system",
              content:
                "You help small studio owners write clear, warm copy. Never use words: API, SKU, Stripe, vendor, onboarding, deploy.",
            },
            { role: "user", content: prompt },
          ],
        }),
      });
      const raw = (await res.json()) as { choices?: { message?: { content?: string } }[]; error?: { message?: string } };
      if (!res.ok) {
        return NextResponse.json({ error: raw.error?.message ?? "Suggest failed" }, { status: 502 });
      }
      const text = raw.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "") ?? "";
      if (text) return NextResponse.json({ text });
    } catch {
      /* fall through */
    }
  }

  const fallback =
    kind === "welcome"
      ? `${studioName} welcomes you — handmade pieces and classes in a calm, creative space.`
      : title
        ? `${title}: handmade with care, ready to ship from our studio.`
        : "Handmade ceramics from our studio — each piece is unique.";

  return NextResponse.json({ text: fallback });
}
