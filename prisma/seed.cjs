/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Creates or updates a hyper_admin user from env (Railway / local).
 * Run: npx prisma db seed   (requires DATABASE_URL)
 */
const path = require("path");
const { config } = require("dotenv");

config({ path: path.join(__dirname, "..", ".env") });

const { PrismaClient } = require("@prisma/client");
const { hash } = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const emailRaw = process.env.SEED_HYPER_ADMIN_EMAIL;
  const password = process.env.SEED_HYPER_ADMIN_PASSWORD;
  if (!emailRaw?.trim() || !password?.length) {
    console.log(
      "[seed] Skip: set SEED_HYPER_ADMIN_EMAIL and SEED_HYPER_ADMIN_PASSWORD to upsert hyper_admin",
    );
    return;
  }
  const email = emailRaw.trim().toLowerCase();
  const passwordHash = await hash(password, 12);
  const now = new Date();
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role: "hyper_admin", emailVerifiedAt: now },
    update: { passwordHash, role: "hyper_admin", emailVerifiedAt: now },
  });
  console.log("[seed] hyper_admin ready — sign in at /login with:", email);

  await prisma.featureFlag.upsert({
    where: { flagKey: "booking_checkout_enabled" },
    create: {
      flagKey: "booking_checkout_enabled",
      flagValue: { description: "When inactive, class booking checkout returns 503." },
      isActive: true,
    },
    update: {},
  });
  await prisma.featureFlag.upsert({
    where: { flagKey: "marketplace_checkout_enabled" },
    create: {
      flagKey: "marketplace_checkout_enabled",
      flagValue: { description: "When inactive, product lines in cart checkout return 503." },
      isActive: true,
    },
    update: {},
  });
  console.log("[seed] runtime checkout feature flags upserted (see /admin/system)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
