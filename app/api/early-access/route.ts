import { NextResponse } from "next/server";

/**
 * Lead capture is closed; studio setup is direct in the dashboard.
 * Returns 410 so clients and tests have a stable contract.
 */
export async function POST() {
  return NextResponse.json(
    { error: "This form is closed. Create your studio from the dashboard instead." },
    { status: 410 },
  );
}
