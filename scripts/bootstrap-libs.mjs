import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function w(rel, content) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content.trimStart(), "utf8");
}

w(
  "lib/auth-session.ts",
  `
import { auth } from "@/auth";
import type { UserRole } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  const role = (session?.user as { role?: UserRole })?.role;
  if (!id || !email || !role) return null;
  return { id, email, role };
}

export function isAdminRole(role: UserRole): boolean {
  return role === "hyper_admin" || role === "admin";
}
`
);

w(
  "lib/slug.ts",
  `
export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^\\w\\s-]/g, "")
      .replace(/[\\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "item"
  );
}
`
);

w(
  "lib/commission.ts",
  `
import { prisma } from "@/lib/db";
import type { CommissionItemType } from "@prisma/client";

const DEFAULT_BPS_KEY = "default_product_commission_bps";

export async function resolveCommissionBps(
  studioId: string,
  itemType: CommissionItemType
): Promise<number> {
  const vendorRule = await prisma.commissionRule.findFirst({
    where: {
      isActive: true,
      ruleScope: "vendor",
      studioId,
      itemType,
    },
    orderBy: { createdAt: "desc" },
  });
  if (vendorRule) return vendorRule.percentageBasisPoints;

  const globalRule = await prisma.commissionRule.findFirst({
    where: {
      isActive: true,
      ruleScope: "global",
      studioId: null,
      itemType,
    },
    orderBy: { createdAt: "desc" },
  });
  if (globalRule) return globalRule.percentageBasisPoints;

  const fallback = await prisma.adminConfig.findUnique({
    where: { configKey: DEFAULT_BPS_KEY },
  });
  if (fallback?.configValue && typeof fallback.configValue === "object" && "bps" in fallback.configValue) {
    const bps = (fallback.configValue as { bps: number }).bps;
    if (typeof bps === "number" && bps >= 0) return bps;
  }
  return 1000;
}

export function commissionCentsFromLine(lineTotalCents: number, basisPoints: number): number {
  return Math.floor((lineTotalCents * basisPoints) / 10000);
}
`
);

w(
  "lib/stripe.ts",
  `
import Stripe from "stripe";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeSingleton;
}
`
);
console.log("done");
