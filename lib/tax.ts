export function calculateEstimatedTaxCents(opts: {
  subtotalCents: number;
  shippingCents?: number;
  destinationCountry?: string | null;
}) {
  const country = (opts.destinationCountry || "GR").toUpperCase();
  const taxable = opts.subtotalCents + (opts.shippingCents || 0);
  if (country === "GR") return Math.round(taxable * 0.24);
  if (["FR", "DE", "ES", "IT", "PT", "IE", "NL", "BE"].includes(country)) return Math.round(taxable * 0.21);
  return Math.round(taxable * 0.2);
}

export function stripeTaxEnabled() {
  return process.env.STRIPE_TAX_ENABLED === "1";
}
