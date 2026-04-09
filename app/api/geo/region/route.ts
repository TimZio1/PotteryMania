import { NextResponse } from "next/server";
import { REGION_COOKIE_KEY, resolveRequestShippingRegion } from "@/lib/request-region";
import { isShippingZone } from "@/lib/shipping-zones";

export const dynamic = "force-dynamic";

export async function GET() {
  const resolved = await resolveRequestShippingRegion();
  return NextResponse.json(resolved);
}

export async function POST(req: Request) {
  let body: { region?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const region = typeof body.region === "string" ? body.region : "";
  if (!isShippingZone(region)) {
    return NextResponse.json({ error: "Invalid region." }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, region });
  res.cookies.set(REGION_COOKIE_KEY, region, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
