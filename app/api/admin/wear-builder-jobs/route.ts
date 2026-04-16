import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireHyperAdminUser } from "@/lib/auth-session";
import { logAdminAction } from "@/lib/admin-audit";
import { enqueueWearBuilderJob } from "@/lib/wear-builder-jobs";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const LIST_TAKE = 40;

export async function GET() {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const jobs = await prisma.wearBuilderJob.findMany({
    orderBy: { createdAt: "desc" },
    take: LIST_TAKE,
    select: {
      id: true,
      state: true,
      designImageUrl: true,
      spreadconnectDesignId: true,
      spreadconnectArticleId: true,
      wearProductId: true,
      errorMessage: true,
      createdByUserId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ jobs });
}

type PostBody = {
  designImageUrl?: unknown;
  articleCreationPayload?: unknown;
  wearProductId?: unknown;
};

export async function POST(req: Request) {
  const user = await requireHyperAdminUser();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: PostBody;
  try {
    body = (await req.json()) as PostBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const designImageUrl =
    typeof body.designImageUrl === "string" ? body.designImageUrl.trim() : "";
  const articleCreationPayload =
    body.articleCreationPayload != null &&
    typeof body.articleCreationPayload === "object"
      ? (body.articleCreationPayload as Prisma.InputJsonValue)
      : null;

  let wearProductId: string | null = null;
  if (typeof body.wearProductId === "string" && body.wearProductId.trim()) {
    wearProductId = body.wearProductId.trim();
    const exists = await prisma.wearProduct.findUnique({
      where: { id: wearProductId },
      select: { id: true },
    });
    if (!exists) {
      return NextResponse.json(
        { error: "wearProductId not found" },
        { status: 400 },
      );
    }
  }

  if (!designImageUrl && articleCreationPayload == null) {
    return NextResponse.json(
      {
        error: "Provide at least one of designImageUrl (https) or articleCreationPayload",
      },
      { status: 400 },
    );
  }

  if (designImageUrl && !designImageUrl.startsWith("https://")) {
    return NextResponse.json(
      { error: "designImageUrl must start with https://" },
      { status: 400 },
    );
  }

  try {
    const job = await enqueueWearBuilderJob({
      createdByUserId: user.id,
      designImageUrl: designImageUrl || null,
      articleCreationPayload,
      wearProductId,
    });
    void logAdminAction({
      actorUserId: user.id,
      action: "wear_builder_job_enqueued",
      entityType: "wear_builder_job",
      entityId: job.id,
      after: { state: job.state, hasDesignUrl: !!job.designImageUrl },
    }).catch(() => undefined);
    return NextResponse.json({ job });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "enqueue failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
