const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_HYPER_ADMIN_EMAIL || "admin@potterymania.local";
  const password = process.env.SEED_HYPER_ADMIN_PASSWORD || "change-me-in-production";
  const hash = await bcrypt.hash(password, 12);
  await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash: hash, role: "hyper_admin" },
    update: { passwordHash: hash, role: "hyper_admin" },
  });
  console.log("Seeded hyper_admin:", email);

  const categories = [
    ["Mugs", "mugs"],
    ["Bowls", "bowls"],
    ["Vases", "vases"],
    ["Plates", "plates"],
    ["Sculptures", "sculptures"],
  ];
  for (const [name, slug] of categories) {
    await prisma.productCategory.upsert({
      where: { slug },
      create: { name, slug, isActive: true },
      update: { name, isActive: true },
    });
  }
  console.log("Seeded categories");

  await prisma.adminConfig.upsert({
    where: { configKey: "default_product_commission_bps" },
    create: { configKey: "default_product_commission_bps", configValue: { bps: 1000 } },
    update: { configValue: { bps: 1000 } },
  });

  await prisma.commissionRule.updateMany({
    where: { ruleScope: "global", studioId: null, itemType: "product" },
    data: { isActive: false },
  });
  await prisma.commissionRule.create({
    data: {
      ruleScope: "global",
      studioId: null,
      itemType: "product",
      percentageBasisPoints: 1000,
      isActive: true,
    },
  });
  console.log("Seeded global product commission 10% (1000 bps)");
  await prisma.commissionRule.updateMany({
    where: { ruleScope: "global", studioId: null, itemType: "booking" },
    data: { isActive: false },
  });
  await prisma.commissionRule.create({
    data: {
      ruleScope: "global",
      studioId: null,
      itemType: "booking",
      percentageBasisPoints: 1000,
      isActive: true,
    },
  });
  console.log("Seeded global booking commission 10% (1000 bps)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());