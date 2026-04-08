type ProductDescriptionInput = {
  productType: "wear";
  title: string;
  subtitle?: string | null;
  existingDescription?: string | null;
  imageUrls?: string[] | null;
  category?: string | null;
  materials?: string | null;
  dimensions?: string | null;
  weightGrams?: number | null;
  colors?: string[] | null;
  sizes?: string[] | null;
  tags?: string[] | null;
  careInstructions?: string | null;
  priceCents: number;
  currency: string;
};

type ProductDescriptionUsage = {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
};

export type ProductDescriptionResult = {
  description: string;
  model: string;
  usage: ProductDescriptionUsage;
  attempts: number;
};

type OpenAIResponse = {
  error?: { message?: string };
  choices?: { message?: { content?: string } }[];
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
};

type OpenAIUserContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

const SYSTEM_PROMPT = [
  "You are a professional product copywriter.",
  "You write precise, realistic, and compelling product descriptions.",
  "You NEVER invent details. You ONLY use provided data.",
  "If information is missing, you omit it.",
  "Tone: premium, clear, human, slightly emotional but grounded.",
].join("\n");

const GENERIC_CLICHES = [
  /\bhigh quality\b/i,
  /\bbest\b/i,
  /\btop[- ]notch\b/i,
  /\bpremium craftsmanship\b/i,
  /\bcrafted to perfection\b/i,
];

const MATERIAL_KEYWORDS = [
  "cotton",
  "polyester",
  "linen",
  "wool",
  "silk",
  "wood",
  "glass",
  "metal",
  "stainless steel",
  "leather",
];

function cleanString(value: string | null | undefined) {
  return value?.trim() || null;
}

function cleanList(values: string[] | null | undefined) {
  const out = (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .filter((value, index, arr) => arr.indexOf(value) === index);
  return out.length > 0 ? out : null;
}

function buildSystemPrompt() {
  const extra = [
    "These products are wearable items sold by PotteryMania.",
    "Focus on the design, visible options, and the feel or fit only when explicitly supported by the provided data.",
    "If product image URLs are provided, you may describe only the design elements that are clearly visible in those images.",
  ];

  return [
    SYSTEM_PROMPT,
    "",
    ...extra,
    "",
    "Output format requirements:",
    "- 1 main paragraph (emotional + descriptive)",
    "- 1 bullet list of key features",
    "- 1 short closing line (use-case or feeling)",
    "",
    "Hard rules:",
    "- Do not invent materials, sizes, certifications, specs, performance, care, origin, or usage claims.",
    "- Do not mention missing information.",
    "- Avoid generic filler and clichés.",
    "- Transform the input into polished copy; do not just echo the fields.",
  ].join("\n");
}

function buildUserInput(input: ProductDescriptionInput) {
  const payload: Record<string, unknown> = {
    title: input.title,
    category: cleanString(input.category),
    materials: cleanString(input.materials),
    dimensions: cleanString(input.dimensions),
    weight: input.weightGrams != null ? `${input.weightGrams} g` : null,
    colors: cleanList(input.colors),
    sizes: cleanList(input.sizes),
    existing_description: cleanString(input.existingDescription),
    tags: cleanList(input.tags),
    subtitle: cleanString(input.subtitle),
    care_instructions: cleanString(input.careInstructions),
  };

  return JSON.stringify(
    Object.fromEntries(Object.entries(payload).filter(([, value]) => value != null)),
    null,
    2,
  );
}

function buildUserContent(input: ProductDescriptionInput): string | OpenAIUserContentPart[] {
  const text = `Use only this structured product data:\n${buildUserInput(input)}`;
  const imageUrls = cleanList(input.imageUrls)?.slice(0, 2) ?? [];
  if (imageUrls.length === 0) return text;

  return [
    { type: "text", text },
    ...imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: { url },
    })),
  ];
}

function usageFromRaw(raw: OpenAIResponse): ProductDescriptionUsage {
  return {
    promptTokens: raw.usage?.prompt_tokens ?? null,
    completionTokens: raw.usage?.completion_tokens ?? null,
    totalTokens: raw.usage?.total_tokens ?? null,
  };
}

function containsUnbackedMaterial(text: string, input: ProductDescriptionInput) {
  const source = [
    input.title,
    input.category ?? "",
    input.materials ?? "",
    input.existingDescription ?? "",
  ]
    .join(" ")
    .toLowerCase();

  for (const keyword of MATERIAL_KEYWORDS) {
    if (text.toLowerCase().includes(keyword) && !source.includes(keyword)) {
      return keyword;
    }
  }
  return null;
}

function hasInventedSpecs(text: string, input: ProductDescriptionInput) {
  const allowsMeasurements =
    Boolean(cleanString(input.dimensions)) ||
    input.weightGrams != null ||
    /\b\d+(?:\.\d+)?\s?(cm|mm|m|in|inch|inches|g|kg|oz)\b/i.test(input.existingDescription ?? "");

  if (allowsMeasurements) return false;
  return /\b\d+(?:\.\d+)?\s?(cm|mm|m|in|inch|inches|g|kg|oz)\b/i.test(text);
}

function looksTooCloseToInput(text: string, input: ProductDescriptionInput) {
  const normalizedOutput = text.replace(/\s+/g, " ").trim().toLowerCase();
  const normalizedInput = [
    input.title,
    input.subtitle ?? "",
    input.existingDescription ?? "",
    ...(input.colors ?? []),
    ...(input.sizes ?? []),
  ]
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  if (!normalizedInput) return false;
  return normalizedOutput === normalizedInput || normalizedOutput.includes(normalizedInput);
}

function validateOutput(text: string, input: ProductDescriptionInput) {
  if (text.trim().length < 80) return "Output too short";
  if (!/^\s*[-•]\s+/m.test(text)) return "Output missing bullet list";
  if (looksTooCloseToInput(text, input)) return "Output repeats input too closely";
  if (GENERIC_CLICHES.some((pattern) => pattern.test(text))) return "Output uses generic clichés";

  const unbackedMaterial = containsUnbackedMaterial(text, input);
  if (unbackedMaterial) return `Output introduced unsupported material: ${unbackedMaterial}`;

  if (hasInventedSpecs(text, input)) return "Output introduced unsupported specs";

  return null;
}

async function callOpenAI(systemPrompt: string, userInput: string | OpenAIUserContentPart[]) {
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
      temperature: 0.6,
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userInput },
      ],
    }),
  });

  const raw = (await res.json()) as OpenAIResponse;
  if (!res.ok) {
    throw new Error(raw.error?.message ?? `OpenAI HTTP ${res.status}`);
  }

  const text = raw.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("Empty model response");
  }

  return { text, raw, model };
}

export async function generateProductDescription(
  rawInput: ProductDescriptionInput,
): Promise<ProductDescriptionResult> {
  const input: ProductDescriptionInput = {
    ...rawInput,
    title: rawInput.title.trim(),
    subtitle: cleanString(rawInput.subtitle),
    existingDescription: cleanString(rawInput.existingDescription),
    imageUrls: cleanList(rawInput.imageUrls),
    category: cleanString(rawInput.category),
    materials: cleanString(rawInput.materials),
    dimensions: cleanString(rawInput.dimensions),
    careInstructions: cleanString(rawInput.careInstructions),
    colors: cleanList(rawInput.colors),
    sizes: cleanList(rawInput.sizes),
    tags: cleanList(rawInput.tags),
  };

  if (!input.title) {
    throw new Error("Product title is required for AI description generation");
  }

  const systemPrompt = buildSystemPrompt();
  const userInput = buildUserContent(input);

  let lastValidationError = "Model response failed validation";
  let lastUsage: ProductDescriptionUsage = {
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
  };

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { text, raw, model } = await callOpenAI(systemPrompt, userInput);
    lastUsage = usageFromRaw(raw);

    const validationError = validateOutput(text, input);
    if (!validationError) {
      return {
        description: text,
        model,
        usage: lastUsage,
        attempts: attempt,
      };
    }

    lastValidationError = validationError;
  }

  throw new Error(`AI description generation failed validation: ${lastValidationError}`);
}

export type { ProductDescriptionInput, ProductDescriptionUsage };
