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
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash, role: "hyper_admin" },
    update: { passwordHash, role: "hyper_admin" },
  });
  console.log("[seed] hyper_admin ready — sign in at /login with:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
