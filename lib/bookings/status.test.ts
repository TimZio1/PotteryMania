import { describe, expect, it } from "vitest";
import {
  cancelStatusForRole,
  isCancellable,
  isCancelled,
  isCompletable,
  isReschedulable,
} from "./status";

describe("booking status transitions", () => {
  it("allows cancellation only for cancellable statuses", () => {
    expect(isCancellable("pending")).toBe(true);
    expect(isCancellable("awaiting_vendor_approval")).toBe(true);
    expect(isCancellable("confirmed")).toBe(true);
    expect(isCancellable("completed")).toBe(false);
    expect(isCancellable("cancelled_by_admin")).toBe(false);
  });

  it("allows reschedule only for approved statuses", () => {
    expect(isReschedulable("confirmed")).toBe(true);
    expect(isReschedulable("awaiting_vendor_approval")).toBe(true);
    expect(isReschedulable("pending")).toBe(false);
    expect(isReschedulable("completed")).toBe(false);
  });

  it("allows completion only from confirmed", () => {
    expect(isCompletable("confirmed")).toBe(true);
    expect(isCompletable("awaiting_vendor_approval")).toBe(false);
    expect(isCompletable("cancelled_by_customer")).toBe(false);
  });

  it("detects cancelled statuses and maps cancellation by role", () => {
    expect(isCancelled("cancelled_by_customer")).toBe(true);
    expect(isCancelled("cancelled_by_vendor")).toBe(true);
    expect(isCancelled("cancelled_by_admin")).toBe(true);
    expect(isCancelled("confirmed")).toBe(false);

    expect(cancelStatusForRole("customer")).toBe("cancelled_by_customer");
    expect(cancelStatusForRole("vendor")).toBe("cancelled_by_vendor");
    expect(cancelStatusForRole("admin")).toBe("cancelled_by_admin");
  });
});

