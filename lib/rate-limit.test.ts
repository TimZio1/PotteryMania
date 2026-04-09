import { describe, expect, it } from "vitest";
import { checkRateLimit, getClientKey } from "./rate-limit";

describe("rate-limit abuse protections", () => {
  it("rejects requests after limit is exhausted in fixed window", () => {
    const key = `abuse:${Date.now()}`;
    const limit = 5;
    const windowMs = 60_000;

    for (let i = 0; i < limit; i += 1) {
      const r = checkRateLimit(key, limit, windowMs);
      expect(r.allowed).toBe(true);
    }

    const blocked = checkRateLimit(key, limit, windowMs);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("resets allowance after window expiration", async () => {
    const key = `window-reset:${Date.now()}`;
    const limit = 2;
    const windowMs = 15;

    expect(checkRateLimit(key, limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit(key, limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit(key, limit, windowMs).allowed).toBe(false);

    await new Promise((resolve) => setTimeout(resolve, windowMs + 10));
    const reopened = checkRateLimit(key, limit, windowMs);
    expect(reopened.allowed).toBe(true);
    expect(reopened.remaining).toBe(limit - 1);
  });

  it("extracts client key from forwarded headers", () => {
    const req = new Request("http://localhost/api/test", {
      headers: { "x-forwarded-for": "203.0.113.12, 10.0.0.1" },
    });
    expect(getClientKey(req)).toBe("203.0.113.12");
  });

  it("keeps buckets isolated across different keys", () => {
    const keyA = `iso-a:${Date.now()}`;
    const keyB = `iso-b:${Date.now()}`;
    const limit = 3;
    const windowMs = 60_000;

    expect(checkRateLimit(keyA, limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit(keyA, limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit(keyA, limit, windowMs).allowed).toBe(true);
    expect(checkRateLimit(keyA, limit, windowMs).allowed).toBe(false);

    // A separate key should still have fresh allowance.
    const firstB = checkRateLimit(keyB, limit, windowMs);
    expect(firstB.allowed).toBe(true);
    expect(firstB.remaining).toBe(limit - 1);
  });

  it("keeps resetAt stable while bucket is active", () => {
    const key = `reset-stable:${Date.now()}`;
    const limit = 4;
    const windowMs = 30_000;

    const first = checkRateLimit(key, limit, windowMs);
    const second = checkRateLimit(key, limit, windowMs);
    const third = checkRateLimit(key, limit, windowMs);

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(third.allowed).toBe(true);
    expect(second.resetAt).toBe(first.resetAt);
    expect(third.resetAt).toBe(first.resetAt);
  });
});
