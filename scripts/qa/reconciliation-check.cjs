#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

function asPct(n, d) {
  if (!d) return "0.00%";
  return `${((n / d) * 100).toFixed(2)}%`;
}

function nowIso() {
  return new Date().toISOString();
}

function writeReport(lines) {
  const outPath = path.join(process.cwd(), "qa", "evidence", "logic", "reconciliation-report.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  return outPath;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    const outPath = writeReport([
      "# Reconciliation Report",
      "",
      `- Timestamp: ${nowIso()}`,
      "",
      "## Verdict",
      "",
      "BLOCKED",
      "",
      "- DATABASE_URL is missing.",
    ]);
    console.error("[reconciliation-check] FAIL: DATABASE_URL is required.");
    console.error(`[reconciliation-check] Evidence written: ${outPath}`);
    process.exit(1);
  }

  try {
    new URL(databaseUrl);
  } catch {
    const outPath = writeReport([
      "# Reconciliation Report",
      "",
      `- Timestamp: ${nowIso()}`,
      "",
      "## Verdict",
      "",
      "BLOCKED",
      "",
      "- `DATABASE_URL` is invalid and could not be parsed.",
    ]);
    console.error("[reconciliation-check] FAIL: DATABASE_URL is invalid.");
    console.error(`[reconciliation-check] Evidence written: ${outPath}`);
    process.exit(1);
  }

  const prisma = new PrismaClient({ log: ["error"] });
  const startedAt = nowIso();
  const failures = [];

  try {
    async function scanPaymentConsistency() {
      const PAGE_SIZE = 500;
      let cursorId = null;
      let inspected = 0;
      let orphanPayments = 0;
      let currencyMismatches = 0;
      for (;;) {
        const rows = await prisma.payment.findMany({
          take: PAGE_SIZE,
          ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
          orderBy: { id: "asc" },
          select: {
            id: true,
            currency: true,
            order: { select: { id: true, currency: true } },
          },
        });
        if (rows.length === 0) break;
        for (const row of rows) {
          inspected += 1;
          if (!row.order?.id) {
            orphanPayments += 1;
            continue;
          }
          if (row.order.currency !== row.currency) currencyMismatches += 1;
        }
        cursorId = rows[rows.length - 1].id;
        if (rows.length < PAGE_SIZE) break;
      }
      return { inspected, orphanPayments, currencyMismatches };
    }

    const [
      totalOrders,
      paidOrders,
      refundedOrders,
      partialRefundOrders,
      succeededPayments,
      refundedPayments,
      partialRefundPayments,
      negativeOrders,
      paymentIntegrity,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { paymentStatus: "paid" } }),
      prisma.order.count({ where: { paymentStatus: "refunded" } }),
      prisma.order.count({ where: { paymentStatus: "partially_refunded" } }),
      prisma.payment.count({ where: { paymentStatus: "succeeded" } }),
      prisma.payment.count({ where: { paymentStatus: "refunded" } }),
      prisma.payment.count({ where: { paymentStatus: "partially_refunded" } }),
      prisma.order.count({ where: { totalCents: { lt: 0 } } }),
      scanPaymentConsistency(),
    ]);
    const { orphanPayments, currencyMismatches, inspected: inspectedPayments } = paymentIntegrity;

    // Sanity assertions for money-path consistency.
    if (paidOrders > 0 && succeededPayments === 0) {
      failures.push("Orders marked paid exist but there are zero succeeded payment records.");
    }
    if (refundedOrders > refundedPayments + partialRefundPayments) {
      failures.push("More refunded orders than refunded payment records.");
    }
    if (partialRefundOrders > succeededPayments + partialRefundPayments + refundedPayments) {
      failures.push("Partially refunded orders exceed available payment records.");
    }
    if (orphanPayments > 0) {
      failures.push(`Found ${orphanPayments} orphan payment records without an order relation.`);
    }
    if (negativeOrders > 0) {
      failures.push(`Found ${negativeOrders} orders with negative totalCents.`);
    }
    if (currencyMismatches > 0) {
      failures.push(`Found ${currencyMismatches} payments with currency mismatch against their order.`);
    }

    const reportLines = [
      "# Reconciliation Report",
      "",
      `- Timestamp: ${startedAt}`,
      `- Environment: ${process.env.NODE_ENV || "unknown"}`,
      "",
      "## Snapshot",
      "",
      `- Total orders: ${totalOrders}`,
      `- Paid orders: ${paidOrders}`,
      `- Refunded orders: ${refundedOrders}`,
      `- Partially refunded orders: ${partialRefundOrders}`,
      `- Succeeded payments: ${succeededPayments}`,
      `- Refunded payments: ${refundedPayments}`,
      `- Partially refunded payments: ${partialRefundPayments}`,
      `- Payments inspected for integrity: ${inspectedPayments}`,
      `- Paid-order ratio: ${asPct(paidOrders, totalOrders)}`,
      "",
      "## Integrity Checks",
      "",
      `- Orphan payments: ${orphanPayments}`,
      `- Negative order totals: ${negativeOrders}`,
      `- Payment/order currency mismatches: ${currencyMismatches}`,
      "",
      failures.length === 0 ? "## Verdict\n\nPASS" : `## Verdict\n\nFAIL\n\n${failures.map((f) => `- ${f}`).join("\n")}`,
      "",
    ];

    const outPath = writeReport(reportLines);

    if (failures.length > 0) {
      console.error("[reconciliation-check] FAIL");
      failures.forEach((f) => console.error(` - ${f}`));
      console.error(`[reconciliation-check] Evidence written: ${outPath}`);
      process.exit(1);
    }

    console.log("[reconciliation-check] PASS");
    console.log(`[reconciliation-check] Evidence written: ${outPath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const outPath = writeReport([
      "# Reconciliation Report",
      "",
      `- Timestamp: ${startedAt}`,
      `- Environment: ${process.env.NODE_ENV || "unknown"}`,
      "",
      "## Verdict",
      "",
      "BLOCKED",
      "",
      `- Reconciliation query execution failed: ${errorMessage}`,
    ]);
    console.error("[reconciliation-check] FAIL: unexpected error");
    console.error(error instanceof Error ? error.stack || error.message : errorMessage);
    console.error(`[reconciliation-check] Evidence written: ${outPath}`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

void main();
