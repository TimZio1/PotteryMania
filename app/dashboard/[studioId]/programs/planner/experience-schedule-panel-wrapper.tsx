"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { ExperienceSchedulePanel, type RecurringRuleRow } from "./experience-schedule-panel";

type Props = {
  studioId: string;
  experienceId: string;
  experienceTitle: string;
  experienceStatus: string;
  initialRules: RecurringRuleRow[];
};

export function ExperienceSchedulePanelWrapper({
  studioId,
  experienceId,
  experienceTitle,
  experienceStatus,
  initialRules,
}: Props) {
  const router = useRouter();

  const refresh = useCallback(async () => {
    router.refresh();
  }, [router]);

  const statusBadge =
    experienceStatus === "active"
      ? "bg-emerald-100 text-emerald-800"
      : experienceStatus === "draft"
        ? "bg-amber-100 text-amber-800"
        : "bg-stone-100 text-stone-600";

  const statusLabel =
    experienceStatus === "active"
      ? "Live"
      : experienceStatus === "draft"
        ? "Draft"
        : experienceStatus === "archived"
          ? "Archived"
          : experienceStatus;

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge}`}>{statusLabel}</span>
      </div>
      <ExperienceSchedulePanel
        studioId={studioId}
        experienceId={experienceId}
        experienceTitle={experienceTitle}
        rules={initialRules}
        onRefresh={refresh}
      />
    </div>
  );
}
