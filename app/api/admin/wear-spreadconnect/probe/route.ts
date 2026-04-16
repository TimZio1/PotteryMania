import { NextResponse } from "next/server";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logApiError } from "@/lib/monitoring";
import {
  isSpreadconnectProbeEnabled,
  spreadconnectProbeAuthentication,
  spreadconnectProbeCreateArticle,
  spreadconnectProbeDesignUploadFromUrl,
} from "@/lib/spreadconnect-probe";
import { getSpreadconnectConfig } from "@/lib/spreadconnect-config";
import { logAdminAction } from "@/lib/admin-audit";

export const dynamic = "force-dynamic";

/** Metadata only — safe without probe writes */
export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = getSpreadconnectConfig();
  return NextResponse.json({
    probeEnabled: isSpreadconnectProbeEnabled(),
    spreadconnectConfigured: cfg != null,
    supplierEnvironment: cfg?.supplierEnvironment ?? null,
    baseUrl: cfg?.baseUrl ?? null,
    liveSubmissionAllowed: cfg?.liveSubmissionAllowed ?? null,
    actions: {
      authentication: "GET /authentication — read-only key test",
      design_from_url: "POST /designs/upload (multipart `url`) — needs imageUrl (https png recommended)",
      create_article: "POST /articles — pass full OpenAPI ArticleCreation JSON in `article`",
    },
    note: "Set SPREADCONNECT_PROBE_ENABLED=true to allow POST. Use staging first. 60 req/min per OpenAPI.",
  });
}

type PostBody = {
  action?: unknown;
  imageUrl?: unknown;
  article?: unknown;
};

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isSpreadconnectProbeEnabled()) {
    return NextResponse.json(
      {
        error: "Spreadconnect probes disabled",
        hint: "Set SPREADCONNECT_PROBE_ENABLED=true (use only in controlled environments; then POST with { action, ... })",
      },
      { status: 403 },
    );
  }

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const action = typeof body.action === "string" ? body.action : "";

  try {
    if (action === "authentication") {
      const r = await spreadconnectProbeAuthentication();
      void logAdminAction({
        actorUserId: user.id,
        action: "wear_spreadconnect_probe",
        entityType: "spreadconnect",
        entityId: "authentication",
        after: { status: r.status, ok: r.ok },
        reason: "GET /authentication",
      }).catch(() => undefined);
      return NextResponse.json({ ok: r.ok, action, status: r.status, data: r.json ?? r.bodySnippet });
    }

    if (action === "design_from_url") {
      const imageUrl = typeof body.imageUrl === "string" ? body.imageUrl.trim() : "";
      if (!imageUrl.startsWith("https://")) {
        return NextResponse.json(
          { error: "imageUrl must be an https URL (Spreadconnect downloads it)" },
          { status: 400 },
        );
      }
      const r = await spreadconnectProbeDesignUploadFromUrl(imageUrl);
      void logAdminAction({
        actorUserId: user.id,
        action: "wear_spreadconnect_probe",
        entityType: "spreadconnect",
        entityId: "design_upload",
        after: { status: r.status, ok: r.ok },
        reason: `design_from_url ${imageUrl.slice(0, 120)}`,
      }).catch(() => undefined);
      return NextResponse.json({ ok: r.ok, action, status: r.status, data: r.json ?? r.bodySnippet });
    }

    if (action === "create_article") {
      if (body.article == null || typeof body.article !== "object") {
        return NextResponse.json(
          { error: "Provide `article` object (OpenAPI ArticleCreation: title, description, variants, configurations)" },
          { status: 400 },
        );
      }
      const r = await spreadconnectProbeCreateArticle(body.article);
      void logAdminAction({
        actorUserId: user.id,
        action: "wear_spreadconnect_probe",
        entityType: "spreadconnect",
        entityId: "create_article",
        after: { status: r.status, ok: r.ok },
        reason: "POST /articles",
      }).catch(() => undefined);
      return NextResponse.json({ ok: r.ok, action, status: r.status, data: r.json ?? r.bodySnippet });
    }

    return NextResponse.json(
      { error: "Unknown action", allowed: ["authentication", "design_from_url", "create_article"] },
      { status: 400 },
    );
  } catch (e) {
    logApiError("spreadconnect_probe", e, { action }, req);
    const msg = e instanceof Error ? e.message : "probe failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
