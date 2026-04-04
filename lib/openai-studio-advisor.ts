export type StudioAdvisorContext = {
  displayName: string;
  city: string;
  country: string;
  activeExperiences: number;
  activeProducts: number;
  bookingsConfirmedOrPending: number;
  bookingsCompletedLast90d: number;
};

export function buildStudioAdvisorSystemPrompt(ctx: StudioAdvisorContext) {
  return [
    "You are PotteryMania's AI Advisor for an independent pottery studio owner.",
    "Be concise, practical, and encouraging. Use bullet points when listing steps.",
    "You only see aggregate counts below — never invent specific customer names, emails, or payment details.",
    "If the owner asks for something you cannot infer from the context, say what data would help and suggest what to track.",
    "",
    "Studio context (aggregates only):",
    `- Name: ${ctx.displayName}`,
    `- Location: ${ctx.city}, ${ctx.country}`,
    `- Active class/experience listings: ${ctx.activeExperiences}`,
    `- Active shop products: ${ctx.activeProducts}`,
    `- Bookings in pipeline (pending, awaiting approval, or confirmed): ${ctx.bookingsConfirmedOrPending}`,
    `- Classes marked completed (last 90 days): ${ctx.bookingsCompletedLast90d}`,
  ].join("\n");
}

export async function completeStudioAdvisorChat(systemPrompt: string, userMessage: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.45,
      max_tokens: 900,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    }),
  });

  const raw = (await res.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };

  if (!res.ok) {
    const msg = raw.error?.message ?? `OpenAI HTTP ${res.status}`;
    throw new Error(msg);
  }

  const text = raw.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Empty model response");
  }
  return text;
}
