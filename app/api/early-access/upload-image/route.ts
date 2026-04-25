import { NextResponse } from "next/server";
import { assertRateLimit } from "@/lib/rate-limit";
import { EARLY_ACCESS_UPLOAD_FOLDER, uploadConfigPayload, uploadConfigured } from "@/lib/uploads";
import { logApiError } from "@/lib/monitoring";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  if (!uploadConfigured()) {
    return NextResponse.json({ error: "Image uploads are not available right now." }, { status: 503 });
  }

  const rate = assertRateLimit(req, "early_access:upload", 8, 60_000);
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many uploads. Try again in a minute." }, { status: 429 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    logApiError("early_access_upload_formdata", e, undefined, req);
    return NextResponse.json({ error: "Invalid upload." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image file." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 12 MB or smaller." }, { status: 400 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "Use a JPEG, PNG, or WebP image." }, { status: 400 });
  }

  const signed = uploadConfigPayload(EARLY_ACCESS_UPLOAD_FOLDER);
  const outgoing = new FormData();
  outgoing.append("file", file);
  outgoing.append("api_key", signed.apiKey);
  outgoing.append("folder", signed.folder);
  outgoing.append("timestamp", signed.timestamp);
  outgoing.append("signature", signed.signature);

  const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${signed.cloudName}/image/upload`, {
    method: "POST",
    body: outgoing,
  });
  const uploadJson = (await uploadRes.json()) as { secure_url?: string; error?: { message?: string } };
  if (!uploadRes.ok) {
    return NextResponse.json(
      { error: uploadJson.error?.message || "Upload failed" },
      { status: 502 },
    );
  }
  const secureUrl = uploadJson.secure_url;
  if (typeof secureUrl !== "string" || !secureUrl.startsWith("https://")) {
    return NextResponse.json({ error: "Upload did not return a valid URL." }, { status: 502 });
  }

  return NextResponse.json({ ok: true, secureUrl });
}
