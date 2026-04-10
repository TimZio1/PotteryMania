import { describe, expect, it } from "vitest";

import { POST } from "@/app/api/early-access/route";

describe("API contract: POST /api/early-access", () => {
  it("returns 410 with stable error when lead capture is closed", async () => {
    const res = await POST();
    const json = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(410);
    expect(json.error).toBe("This form is closed. Create your studio from the dashboard instead.");
  });
});
