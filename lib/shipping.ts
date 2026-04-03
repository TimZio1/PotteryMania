export function calculateShippingRate(opts: {
  subtotalCents: number;
  destinationCountry?: string | null;
  totalWeightGrams?: number;
}) {
  const country = (opts.destinationCountry || "GR").toUpperCase();
  const weight = Math.max(0, opts.totalWeightGrams || 0);

  if (opts.subtotalCents >= 15000) {
    return { shippingCents: 0, methodLabel: "Free shipping" };
  }

  const base = country === "GR" ? 500 : 900;
  const extraWeight = weight > 2000 ? Math.ceil((weight - 2000) / 1000) * 150 : 0;
  return {
    shippingCents: base + extraWeight,
    methodLabel: country === "GR" ? "Standard domestic shipping" : "Standard EU shipping",
  };
}
