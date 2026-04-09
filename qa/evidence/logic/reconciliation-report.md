# Reconciliation Report

- Timestamp: 2026-04-09T20:59:39.549Z
- Environment: unknown

## Verdict

BLOCKED

- Reconciliation query execution failed: 
Invalid `prisma.payment.count()` invocation in
C:\Users\theor\Desktop\POTTERYMANIA -NEW\potterymania\scripts\qa\reconciliation-check.cjs:116:22

  113 prisma.order.count({ where: { paymentStatus: "partially_refunded" } }),
  114 prisma.payment.count({ where: { paymentStatus: "succeeded" } }),
  115 prisma.payment.count({ where: { paymentStatus: "refunded" } }),
→ 116 prisma.payment.count(
Cannot fetch data from service:
fetch failed