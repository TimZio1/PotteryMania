import { randomBytes } from "crypto";
import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

function formatGiftCardCode(body: string) {
  return `PM-GIFT-${body.slice(0, 4)}-${body.slice(4, 8)}`;
}

export function normalizeGiftCardCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "";
  const body = cleaned.startsWith("PMGIFT") ? cleaned.slice(6) : cleaned;
  if (!/^[A-Z0-9]{8}$/.test(body)) return "";
  return formatGiftCardCode(body);
}

export async function allocateGiftCardCode(db: DbClient): Promise<string> {
  for (let i = 0; i < 64; i += 1) {
    const code = formatGiftCardCode(randomBytes(4).toString("hex").toUpperCase());
    const clash = await db.giftCard.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  throw new Error("Could not allocate unique gift card code");
}
