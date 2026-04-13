import QRCode from "qrcode";

export const TICKET_QR_PREFIX = "PMTICKET:";

export function buildTicketQrPayload(ticketRef: string): string {
  return `${TICKET_QR_PREFIX}${ticketRef.trim().toUpperCase()}`;
}

export function normalizeTicketScan(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (trimmed.toUpperCase().startsWith(TICKET_QR_PREFIX)) {
    return trimmed.slice(TICKET_QR_PREFIX.length).trim().toUpperCase();
  }
  return trimmed.toUpperCase();
}

const QR_OPTIONS = {
  errorCorrectionLevel: "M" as const,
  margin: 1,
  scale: 6,
  color: {
    dark: "#44220e",
    light: "#ffffff",
  },
};

export async function buildTicketQrDataUrl(ticketRef: string): Promise<string> {
  return QRCode.toDataURL(buildTicketQrPayload(ticketRef), QR_OPTIONS);
}

export async function buildTicketQrSvg(ticketRef: string): Promise<string> {
  return QRCode.toString(buildTicketQrPayload(ticketRef), {
    ...QR_OPTIONS,
    type: "svg",
  });
}
