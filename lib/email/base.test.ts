import { beforeEach, describe, expect, it, vi } from "vitest";

const resendMocks = vi.hoisted(() => {
  const send = vi.fn();
  const Resend = vi.fn(function Resend() {
    return {
      emails: { send },
    };
  });
  return { Resend, send };
});

vi.mock("resend", () => ({
  Resend: resendMocks.Resend,
}));

import { sendEmailMessages } from "@/lib/email/base";

describe("sendEmailMessages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resendMocks.send.mockReset();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
  });

  it("fails clearly when email transport is not configured", async () => {
    await expect(
      sendEmailMessages([{ to: "customer@example.com", subject: "Confirm", html: "<p>Hello</p>" }]),
    ).rejects.toMatchObject({
      code: "EMAIL_TRANSPORT_NOT_CONFIGURED",
      message: "RESEND_API_KEY is not set; cannot send email.",
    });
    expect(resendMocks.Resend).not.toHaveBeenCalled();
  });

  it("sends through Resend with the configured default sender", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.RESEND_FROM = "Studio <hello@example.com>";
    resendMocks.send.mockResolvedValue({ data: { id: "email_123" }, error: null });

    await sendEmailMessages([{ to: "customer@example.com", subject: "Confirm", html: "<p>Hello</p>" }]);

    expect(resendMocks.Resend).toHaveBeenCalledWith("re_test");
    expect(resendMocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Studio <hello@example.com>",
        to: "customer@example.com",
        subject: "Confirm",
        html: "<p>Hello</p>",
      }),
    );
  });

  it("throws when Resend returns a provider error response", async () => {
    process.env.RESEND_API_KEY = "re_test";
    resendMocks.send.mockResolvedValue({
      data: null,
      error: { message: "The potterymania.com domain is not verified." },
    });

    await expect(
      sendEmailMessages([{ to: "customer@example.com", subject: "Confirm", html: "<p>Hello</p>" }]),
    ).rejects.toMatchObject({
      code: "EMAIL_SEND_FAILED",
      message: "The potterymania.com domain is not verified.",
    });
  });
});
