import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth-session";
import {
  newVerificationToken,
  parseVendorDomainInput,
  vendorDomainTxtHostname,
  expectedVendorDomainTxtValue,
} from "@/lib/vendor-domain";
import {
  vendorDomainCanonicalOrigin,
  vendorDomainConnectTargetHostname,
  vendorDomainResolveFetchBaseUrl,
  vendorDomainSetupReady,
} from "@/lib/vendor-domain-core";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ studioId: string }> };

function setupPayload() {
  return {
    connectTargetHostname: vendorDomainConnectTargetHostname(),
    canonicalOrigin: vendorDomainCanonicalOrigin(),
    resolveBaseUrl: vendorDomainResolveFetchBaseUrl(),
    setupReady: vendorDomainSetupReady(),
  };
}

export async function GET(_req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, ownerUserId: user.id },
    select: { id: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const domains = await prisma.vendorDomain.findMany({
    where: { studioId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      domainName: true,
      domainType: true,
      verificationStatus: true,
      sslStatus: true,
      isActive: true,
      verificationToken: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const payload = domains.map((d) => ({
    id: d.id,
    domainName: d.domainName,
    domainType: d.domainType,
    verificationStatus: d.verificationStatus,
    sslStatus: d.sslStatus,
    isActive: d.isActive,
    txtHostname: vendorDomainTxtHostname(d.domainName),
    txtValue: d.verificationToken ? expectedVendorDomainTxtValue(d.verificationToken) : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }));

  return NextResponse.json({ domains: payload, setup: setupPayload() });
}

export async function POST(req: Request, ctx: Ctx) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { studioId } = await ctx.params;
  const studio = await prisma.studio.findFirst({
    where: { id: studioId, ownerUserId: user.id, status: "approved" },
    select: { id: true },
  });
  if (!studio) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: { domainName?: string; domainType?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const domainName = parseVendorDomainInput(typeof body.domainName === "string" ? body.domainName : "");
  if (!domainName) {
    return NextResponse.json({ error: "Invalid domain name" }, { status: 400 });
  }

  const domainType = body.domainType === "subdomain" ? "subdomain" : "custom";

  const dup = await prisma.vendorDomain.findUnique({ where: { domainName } });
  if (dup && dup.studioId !== studioId) {
    return NextResponse.json({ error: "Domain is already registered" }, { status: 409 });
  }

  const token = newVerificationToken();

  const row = await prisma.vendorDomain.upsert({
    where: { domainName },
    create: {
      studioId,
      domainName,
      domainType,
      verificationToken: token,
      verificationStatus: "pending",
      sslStatus: "pending",
      isActive: false,
    },
    update: {
      studioId,
      domainType,
      verificationToken: token,
      verificationStatus: "pending",
      sslStatus: "pending",
      isActive: false,
    },
  });

  return NextResponse.json({
    domain: {
      id: row.id,
      domainName: row.domainName,
      domainType: row.domainType,
      verificationStatus: row.verificationStatus,
      sslStatus: row.sslStatus,
      isActive: row.isActive,
      txtHostname: vendorDomainTxtHostname(row.domainName),
      txtValue: row.verificationToken ? expectedVendorDomainTxtValue(row.verificationToken) : null,
    },
    setup: setupPayload(),
  });
}
