-- Wear order ops escalation when Spreadconnect submit fails (audit ID 0019)
ALTER TYPE "WearOrderStatus" ADD VALUE 'manual_review';
