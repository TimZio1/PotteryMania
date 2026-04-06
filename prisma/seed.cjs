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

  const templates = [
    {
      slug: "pricing_vs_median",
      category: "pricing",
      title: "Class pricing vs similar studios",
      previewText:
        "We compare your average class price to anonymized peers in your region and category.",
      analysisPrompt:
        "Rule-based: median class price, fill rate; recommend small price experiments when below median with strong fill.",
      basePriceCents: 200,
      complexity: "medium",
    },
    {
      slug: "schedule_weak_slots",
      category: "schedule",
      title: "Underperforming time slots",
      previewText:
        "Which weekdays or hours lag on bookings compared to your own best slots.",
      analysisPrompt:
        "Rule-based: slot-level booking counts last 30d; flag bottom quartile vs studio median.",
      basePriceCents: 120,
      complexity: "simple",
    },
    {
      slug: "class_demand_mix",
      category: "demand",
      title: "Class mix and demand balance",
      previewText:
        "See which experiences drive the most bookings and where demand is idle.",
      analysisPrompt:
        "Rule-based: bookings per experience, capacity utilization; suggest promoting under-filled classes.",
      basePriceCents: 200,
      complexity: "medium",
    },
    {
      slug: "student_retention_signal",
      category: "retention",
      title: "Repeat booking signal",
      previewText:
        "Estimate how often guests return and how you compare to a simple platform baseline.",
      analysisPrompt:
        "Rule-based: repeat customer rate from bookings last 90d.",
      basePriceCents: 350,
      complexity: "advanced",
    },
    {
      slug: "revenue_leakage_no_shows",
      category: "revenue",
      title: "Revenue leakage from cancellations",
      previewText:
        "Approximate deposit and order value at risk from recent cancellations.",
      analysisPrompt:
        "Rule-based: canceled bookings count and deposit totals last 30d.",
      basePriceCents: 200,
      complexity: "medium",
    },
    {
      slug: "capacity_utilization",
      category: "capacity",
      title: "Capacity utilization",
      previewText:
        "Share of seat-nights sold vs available for upcoming sessions.",
      analysisPrompt:
        "Rule-based: confirmed headcount / capacity on future slots in next 14d.",
      basePriceCents: 120,
      complexity: "simple",
    },
    {
      slug: "feature_recommendation_addons",
      category: "feature_rec",
      title: "Platform add-ons that fit your studio",
      previewText:
        "Based on your booking and shop activity, which paid features are most likely to help.",
      analysisPrompt:
        "Rule-based: correlate activity patterns with feature value props (no auto-billing).",
      basePriceCents: 200,
      complexity: "medium",
    },
  ];

  for (const t of templates) {
    await prisma.insightTemplate.upsert({
      where: { slug: t.slug },
      create: {
        slug: t.slug,
        category: t.category,
        title: t.title,
        previewText: t.previewText,
        analysisPrompt: t.analysisPrompt,
        basePriceCents: t.basePriceCents,
        complexity: t.complexity,
        isActive: true,
      },
      update: {
        category: t.category,
        title: t.title,
        previewText: t.previewText,
        analysisPrompt: t.analysisPrompt,
        basePriceCents: t.basePriceCents,
        complexity: t.complexity,
      },
    });
  }
  console.log("[seed] insight_templates upserted (AI monetization v1)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
