import { randomBytes } from "crypto";
import type { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function allocateTicketRef(tx: Tx): Promise<string> {
  for (let i = 0; i < 32; i++) {
    const ref = `PM-${randomBytes(4).toString("hex").toUpperCase()}`;
    const clash = await tx.booking.findUnique({ where: { ticketRef: ref } });
    if (!clash) return ref;
  }
  throw new Error("Could not allocate unique ticket reference");
}
