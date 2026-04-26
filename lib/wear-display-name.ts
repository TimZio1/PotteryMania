export function wearDisplayName(input: {
  name?: string | null;
  subtitle?: string | null;
  spreadconnectProductTypeName?: string | null;
}) {
  const raw = `${input.name ?? ""} ${input.subtitle ?? ""} ${input.spreadconnectProductTypeName ?? ""}`;
  const text = raw.toLowerCase();

  if (/hoodie|pullover|fleece/.test(text)) return "Hoodie";
  if (/sweatshirt|crewneck/.test(text)) return "Sweatshirt";
  if (/long.?sleeve/.test(text)) return "Long-sleeve T-shirt";
  if (/tank/.test(text)) return "Tank top";
  if (/organic/.test(text) && /(t.?shirt|tee|shirt)/.test(text)) return "Organic T-shirt";
  if (/(t.?shirt|tee|shirt)/.test(text)) return "T-shirt";

  return input.name?.trim() || "Apparel";
}
