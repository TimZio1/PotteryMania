import { prisma } from "@/lib/db";
import { logAdminAction } from "@/lib/admin-audit";

const KEY = "ranking_score_weights";

export type RankingScoreWeights = {
  performance: number;
  activity: number;
  manual: number;
};

const DEFAULT: RankingScoreWeights = { performance: 0.7, activity: 0.2, manual: 0.1 };

/**
 * Admin-tunable 70/20/10 weights (P5-K). Stored in `admin_configs` as JSON `{ perf, activity, manual }` each 0–1; normalized to sum 1.
 */
export async function getRankingScoreWeights(): Promise<RankingScoreWeights> {
  const row = await prisma.adminConfig.findUnique({ where: { configKey: KEY } });
  const raw = row?.configValue as { perf?: unknown; activity?: unknown; manual?: unknown } | null;
  const clamp = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : NaN);
  let perf = clamp(raw?.perf);
  let act = clamp(raw?.activity);
  let man = clamp(raw?.manual);
  if (Number.isNaN(perf)) perf = DEFAULT.performance;
  if (Number.isNaN(act)) act = DEFAULT.activity;
  if (Number.isNaN(man)) man = DEFAULT.manual;
  const sum = perf + act + man;
  if (sum <= 0) return { ...DEFAULT };
  return {
    performance: perf / sum,
    activity: act / sum,
    manual: man / sum,
  };
}

export async function setRankingScoreWeights(weights: RankingScoreWeights, actorUserId: string | null) {
  const before = await prisma.adminConfig.findUnique({ where: { configKey: KEY } });
  const payload = {
    perf: weights.performance,
    activity: weights.activity,
    manual: weights.manual,
  };
  await prisma.adminConfig.upsert({
    where: { configKey: KEY },
    create: { configKey: KEY, configValue: payload },
    update: { configValue: payload },
  });
  await logAdminAction({
    actorUserId,
    action: "admin_config.ranking_score_weights",
    entityType: "admin_config",
    entityId: KEY,
    before: before ? { configValue: before.configValue } : null,
    after: { configValue: payload },
  });
}
