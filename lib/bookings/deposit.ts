/**
 * How much to charge at checkout for a booking line.
 * depositBps 0 = charge the full line; 1–10000 = that percentage of the line (rounded up, at least 1¢ when partial).
 */
export function depositChargedCents(fullLineCents: number, depositBps: number): number {
  if (fullLineCents <= 0) return 0;
  if (!depositBps || depositBps <= 0) return fullLineCents;
  const bps = Math.min(10_000, Math.max(1, Math.floor(depositBps)));
  const raw = Math.ceil((fullLineCents * bps) / 10_000);
  return Math.min(fullLineCents, Math.max(1, raw));
}

export type BookingCheckoutPaymentPreference = "deposit" | "full";

export function bookingAllowsFullPaymentOption(input: {
  bookingDepositBps: number;
  allowFullPaymentOption?: boolean | null;
}): boolean {
  return input.bookingDepositBps > 0 && input.allowFullPaymentOption === true;
}

export function normalizeBookingPaymentPreference(
  requested: BookingCheckoutPaymentPreference | null | undefined,
  input: {
    bookingDepositBps: number;
    allowFullPaymentOption?: boolean | null;
  },
): BookingCheckoutPaymentPreference {
  if (input.bookingDepositBps <= 0) return "full";
  if (requested === "full" && bookingAllowsFullPaymentOption(input)) return "full";
  return "deposit";
}

export function bookingChargeNowCents(
  fullLineCents: number,
  input: {
    bookingDepositBps: number;
    allowFullPaymentOption?: boolean | null;
  },
  requested: BookingCheckoutPaymentPreference | null | undefined,
): number {
  const paymentPreference = normalizeBookingPaymentPreference(requested, input);
  return paymentPreference === "full"
    ? fullLineCents
    : depositChargedCents(fullLineCents, input.bookingDepositBps);
}
