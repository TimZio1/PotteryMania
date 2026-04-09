import { describe, expect, it } from "vitest";
import {
  hasSessionLikeCookie,
  isCsrfExemptPath,
  isSameOriginRequest,
  isStateChangingMethod,
} from "./csrf-protection";

describe("csrf-protection helpers", () => {
  it("detects state-changing HTTP methods", () => {
    expect(isStateChangingMethod("POST")).toBe(true);
    expect(isStateChangingMethod("PATCH")).toBe(true);
    expect(isStateChangingMethod("DELETE")).toBe(true);
    expect(isStateChangingMethod("GET")).toBe(false);
    expect(isStateChangingMethod("OPTIONS")).toBe(false);
  });

  it("marks webhook and cron endpoints as csrf-exempt", () => {
    expect(isCsrfExemptPath("/api/webhooks/stripe")).toBe(true);
    expect(isCsrfExemptPath("/api/cron/nightly-job")).toBe(true);
    expect(isCsrfExemptPath("/api/wear/events")).toBe(true);
    expect(isCsrfExemptPath("/api/cart")).toBe(false);
  });

  it("detects session-like and cart cookies", () => {
    expect(hasSessionLikeCookie("pm_cart_id=abc123")).toBe(true);
    expect(hasSessionLikeCookie("__Secure-authjs.session-token=jwt")).toBe(true);
    expect(hasSessionLikeCookie("foo=bar; baz=qux")).toBe(false);
    expect(hasSessionLikeCookie(null)).toBe(false);
  });

  it("accepts same-origin origin or referer", () => {
    expect(isSameOriginRequest("https://potterymania.com", null, "https://potterymania.com")).toBe(true);
    expect(
      isSameOriginRequest(null, "https://potterymania.com/admin/users?x=1", "https://potterymania.com"),
    ).toBe(true);
    expect(isSameOriginRequest("https://evil.example", null, "https://potterymania.com")).toBe(false);
  });
});

