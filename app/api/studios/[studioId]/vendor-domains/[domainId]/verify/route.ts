import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import { dnsTxtContainsVerifyToken } from "@/lib/vendor-domain";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string; domainId: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId, domainId } = await ctx.params;

  const row = await prisma.vendorDomain.findFirst({
    where: { id: domainId, studioId, studio: { ownerUserId: user.id } },
  });
  if (!row || !row.verificationToken) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ok = await dnsTxtContainsVerifyToken(row.domainName, row.verificationToken);
  if (!ok) {
    return NextResponse.json(
      { error: "DNS verification failed", hint: "Add the TXT record, wait for DNS propagation, then try again." },
      { status: 422 },
    );
  }

  await prisma.$transaction([
    prisma.vendorDomain.updateMany({
      where: { studioId, id: { not: row.id }, isActive: true },
      data: { isActive: false },
    }),
    prisma.vendorDomain.update({
      where: { id: row.id },
      data: {
        verificationStatus: "verified",
        isActive: true,
        sslStatus: "pending",
      },
    }),
  ]);

  return NextResponse.json({ ok: true, verificationStatus: "verified", isActive: true });
}
