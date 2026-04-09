import { describe, expect, it } from "vitest";
import {
  allowedWearOrderTransitions,
  canWearOrderTransition,
  isWearCheckoutSessionStatus,
  isWearOrderPaidLike,
  isWearOrderTerminal,
  validateWearOrderTransitionReason,
  wearOrderNeedsOpsAttention,
} from "./wear-order-lifecycle";

describe("wear order lifecycle transitions", () => {
  it("detects paid-like and terminal statuses", () => {
    expect(isWearOrderPaidLike("paid")).toBe(true);
    expect(isWearOrderPaidLike("shipped")).toBe(true);
    expect(isWearOrderPaidLike("pending")).toBe(false);

    expect(isWearOrderTerminal("cancelled")).toBe(true);
    expect(isWearOrderTerminal("refunded")).toBe(true);
    expect(isWearOrderTerminal("in_production")).toBe(false);
  });

  it("recognizes checkout-session compatible statuses", () => {
    expect(isWearCheckoutSessionStatus("pending")).toBe(true);
    expect(isWearCheckoutSessionStatus("paid")).toBe(true);
    expect(isWearCheckoutSessionStatus("manual_review")).toBe(true);
    expect(isWearCheckoutSessionStatus("refunded")).toBe(false);
  });

  it("returns expected transition map for key lifecycle points", () => {
    expect(allowedWearOrderTransitions("pending")).toEqual(["paid", "cancelled"]);
    expect(allowedWearOrderTransitions("paid")).toEqual([
      "manual_review",
      "in_production",
      "fulfilled",
      "cancelled",
      "refunded",
    ]);
    expect(allowedWearOrderTransitions("shipped")).toEqual(["refunded"]);
    expect(allowedWearOrderTransitions("refunded")).toEqual([]);
  });

  it("enforces valid transition edges", () => {
    expect(canWearOrderTransition("pending", "paid")).toBe(true);
    expect(canWearOrderTransition("pending", "shipped")).toBe(false);
    expect(canWearOrderTransition("fulfilled", "shipped")).toBe(true);
    expect(canWearOrderTransition("cancelled", "paid")).toBe(false);
  });

  it("flags ops attention statuses", () => {
    expect(wearOrderNeedsOpsAttention("pending")).toBe(true);
    expect(wearOrderNeedsOpsAttention("in_production")).toBe(true);
    expect(wearOrderNeedsOpsAttention("shipped")).toBe(false);
    expect(wearOrderNeedsOpsAttention("refunded")).toBe(false);
  });

  it("requires minimum reason for sensitive transitions", () => {
    expect(validateWearOrderTransitionReason("paid", "short")).toMatch(/at least 8 characters/i);
    expect(validateWearOrderTransitionReason("cancelled", "short")).toMatch(/at least 8 characters/i);
    expect(validateWearOrderTransitionReason("refunded", "short")).toMatch(/at least 8 characters/i);
    expect(validateWearOrderTransitionReason("refunded", "valid reason text")).toBeNull();
    expect(validateWearOrderTransitionReason("shipped", undefined)).toBeNull();
  });
});
