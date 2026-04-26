export function wearDisplayName(input: {
  slug?: string | null;
  name?: string | null;
  subtitle?: string | null;
  spreadconnectProductTypeName?: string | null;
}) {
  const raw = `${input.name ?? ""} ${input.subtitle ?? ""} ${input.spreadconnectProductTypeName ?? ""}`;
  const text = raw.toLowerCase();
  const garment = resolveGarmentLabel(text);
  const designTitle = cleanDesignTitle(input.name, garment) || cleanDesignTitle(input.slug, garment);

  if (designTitle && garment && designTitle.toLowerCase() !== garment.toLowerCase()) {
    return `${designTitle} · ${garment}`;
  }

  return garment || input.name?.trim() || "Apparel";
}

function resolveGarmentLabel(text: string) {
  if (/hoodie|pullover|fleece/.test(text)) return "Hoodie";
  if (/sweatshirt|crewneck/.test(text)) return "Sweatshirt";
  if (/long.?sleeve/.test(text)) return "Long-sleeve T-shirt";
  if (/tank/.test(text)) return "Tank top";
  if (/organic/.test(text) && /(t.?shirt|tee|shirt)/.test(text)) return "Organic T-shirt";
  if (/(t.?shirt|tee|shirt)/.test(text)) return "T-shirt";
  return null;
}

function cleanDesignTitle(name: string | null | undefined, garment: string | null) {
  let title = name?.replace(/-/g, " ").trim() ?? "";
  if (!title) return "";

  title = title
    .replace(/\b(relaxed fit|regular fit|oversized|unisex|men'?s|women'?s|ingredients)\b/gi, " ")
    .replace(/\b(organic\s+)?(t[-\s]?shirt|tee|shirt)\b/gi, " ")
    .replace(/\b(hoodie|pullover|fleece|sweatshirt|crewneck|tank top|tank|long[-\s]?sleeve)\b/gi, " ")
    .replace(/[·|_/]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!title || (garment && title.toLowerCase() === garment.toLowerCase())) return "";
  return title
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
