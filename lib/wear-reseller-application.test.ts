import { afterEach, describe, expect, it } from "vitest";
import {
  resolveWearResellerApplicationHref,
  WEAR_RESELLER_DEFAULT_HREF,
} from "./wear-reseller-application";

describe("resolveWearResellerApplicationHref", () => {
  const key = "NEXT_PUBLIC_WEAR_RESELLER_APPLICATION_URL";
  const saved = process.env[key];

  afterEach(() => {
    if (saved === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = saved;
    }
  });

  it("returns default sign-up + shop setup when unset", () => {
    delete process.env[key];
    expect(resolveWearResellerApplicationHref()).toBe(WEAR_RESELLER_DEFAULT_HREF);
  });

  it("uses https URL when set", () => {
    process.env[key] = "https://forms.example.com/apply";
    expect(resolveWearResellerApplicationHref()).toBe("https://forms.example.com/apply");
  });

  it("uses internal path when set", () => {
    process.env[key] = "/early-access";
    expect(resolveWearResellerApplicationHref()).toBe("/early-access");
  });

  it("rejects protocol-relative paths", () => {
    process.env[key] = "//evil.example/phish";
    expect(resolveWearResellerApplicationHref()).toBe(WEAR_RESELLER_DEFAULT_HREF);
  });

  it("rejects non-http(s) values", () => {
    process.env[key] = "javascript:alert(1)";
    expect(resolveWearResellerApplicationHref()).toBe(WEAR_RESELLER_DEFAULT_HREF);
  });
});
