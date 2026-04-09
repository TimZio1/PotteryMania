import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { logApiError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = getSpreadconnectConfig();
  if (!cfg) {
    return NextResponse.json({
      ok: false,
      step: "config",
      error: "SPREADCONNECT_API_KEY is missing or set to __PENDING__",
    });
  }

  const results: Record<string, unknown> = {
    baseUrl: cfg.baseUrl,
    keyPrefix: cfg.apiKey.slice(0, 8) + "…",
  };

  // Step 1: Test authentication
  try {
    const authRes = await fetch(`${cfg.baseUrl}/authentication`, {
      headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
      cache: "no-store",
    });
    const authBody = await authRes.text();
    results.auth = {
      status: authRes.status,
      ok: authRes.ok,
      body: authBody.slice(0, 500),
    };
  } catch (e) {
    logApiError("admin_spreadconnect_test_auth_failed", e);
    results.auth = { error: e instanceof Error ? e.message : "fetch failed" };
    return NextResponse.json({ ok: false, ...results });
  }

  // Step 2: Test articles endpoint (no limit/offset first)
  try {
    const artRes = await fetch(`${cfg.baseUrl}/articles`, {
      headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
      cache: "no-store",
    });
    const artBody = await artRes.text();
    results.articles_bare = {
      status: artRes.status,
      ok: artRes.ok,
      body: artBody.slice(0, 1000),
    };
  } catch (e) {
    logApiError("admin_spreadconnect_test_articles_bare_failed", e);
    results.articles_bare = { error: e instanceof Error ? e.message : "fetch failed" };
  }

  // Step 3: Test with limit=1 (smallest possible request)
  try {
    const artRes2 = await fetch(`${cfg.baseUrl}/articles?limit=1&offset=0`, {
      headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
      cache: "no-store",
    });
    const artBody2 = await artRes2.text();
    results.articles_limit1 = {
      status: artRes2.status,
      ok: artRes2.ok,
      body: artBody2.slice(0, 1000),
    };
  } catch (e) {
    logApiError("admin_spreadconnect_test_articles_limit1_failed", e);
    results.articles_limit1 = { error: e instanceof Error ? e.message : "fetch failed" };
  }

  // Step 4: Test with limit=100 (what the sync uses)
  try {
    const artRes3 = await fetch(`${cfg.baseUrl}/articles?limit=100&offset=0`, {
      headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
      cache: "no-store",
    });
    const artBody3 = await artRes3.text();
    results.articles_limit100 = {
      status: artRes3.status,
      ok: artRes3.ok,
      body: artBody3.slice(0, 1000),
    };
  } catch (e) {
    logApiError("admin_spreadconnect_test_articles_limit100_failed", e);
    results.articles_limit100 = { error: e instanceof Error ? e.message : "fetch failed" };
  }

  // Step 5: Test product types endpoint (different resource, same auth)
  try {
    const ptRes = await fetch(`${cfg.baseUrl}/productTypes`, {
      headers: { "X-SPOD-ACCESS-TOKEN": cfg.apiKey },
      cache: "no-store",
    });
    results.productTypes = {
      status: ptRes.status,
      ok: ptRes.ok,
    };
  } catch (e) {
    logApiError("admin_spreadconnect_test_product_types_failed", e);
    results.productTypes = { error: e instanceof Error ? e.message : "fetch failed" };
  }

  return NextResponse.json({ ok: true, ...results });
}
