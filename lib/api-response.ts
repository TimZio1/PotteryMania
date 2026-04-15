import { NextResponse } from "next/server";

/**
 * Standardised API error response.
 * All public API routes should use this instead of ad-hoc NextResponse.json({ error }).
 */
export function apiError(message: string, status: number, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...(extra ?? {}) }, { status });
}

/** Standardised success payload. */
export function apiSuccess<T extends Record<string, unknown>>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}
