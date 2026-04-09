import { NextResponse } from "next/server";
import { assertRateLimit } from "@/lib/rate-limit";
import { uploadConfigPayload, uploadConfigured } from "@/lib/uploads";
import { logApiError } from "@/lib/monitoring";

export async function POST(req: Request) {
  const rate = assertRateLimit(req, "uploads:sign", 30, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many upload requests" }, { status: 429 });
  }
  if (!uploadConfigured()) {
    return NextResponse.json({ error: "Hosted uploads are not configured" }, { status: 503 });
  }

  let body: { folder?: string };
  try {
    body = await req.json();
  } catch (e) {
    logApiError("uploads_sign_invalid_json", e, undefined, req);
    body = {};
  }

  return NextResponse.json({
    ok: true,
    ...uploadConfigPayload(body.folder || "potterymania/uploads"),
  });
}
