"use client";

import { Plus } from "lucide-react";
import type { StageDetail } from "@/components/project-overview/types";

const STATE_SUBTITLE: Record<StageDetail["state"], (pct: number, date: string) => string> = {
  not_started: () => "Not started",
  active: (pct, date) => `Started ${date} · ${pct}% complete`,
  inactive: (pct) => `Paused · ${pct}% complete`,
  complete: (pct, date) => `Completed ${date}`,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface StageHeaderProps {
  stage: StageDetail;
  stageNo: number;
  percentComplete: number;
  canManage: boolean;
  hasChecklist: boolean;
  onAddChecklist: () => void;
  onToggleComplete: () => void;
}

export function StageHeader({
  stage,
  stageNo,
  percentComplete,
  canManage,
  hasChecklist,
  onAddChecklist,
  onToggleComplete,
}: StageHeaderProps) {
  const subtitle = STATE_SUBTITLE[stage.state](
    percentComplete,
    formatDate(stage.state === "complete" ? stage.last_changed_at : stage.added_to_scope_at),
  );

  return (
    // The stage number leads as a label rather than sitting inside the heading: a long
    // stage name wrapped to three lines under "Stage 8 :" and collided with the actions.
    <div className="flex w-full flex-col gap-[16px] lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-col gap-[4px]">
        <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-gca-muted">
          Stage {stageNo}
        </p>
        <h1 className="text-[22px] font-semibold tracking-[-0.33px] text-gca-dark text-balance">
          {stage.stage_name}
        </h1>
        <p className="text-[13px] text-gca-show">{subtitle}</p>
      </div>
      {canManage && (
        <div className="flex shrink-0 flex-col gap-[10px] sm:flex-row sm:items-center sm:gap-[12px]">
          {!hasChecklist && (
            <button
              onClick={onAddChecklist}
              className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[11px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg sm:w-auto sm:py-[10px]"
            >
              <Plus className="size-[10px]" />
              Add a checklist
            </button>
          )}
          <button
            onClick={onToggleComplete}
            disabled={stage.state === "not_started"}
            className={`${stage.state === "complete" ? "border border-gca-green text-gca-dark hover:text-gca-green" : "bg-gca-green hover:bg-gca-green-hover text-gca-on-accent"} w-full cursor-pointer rounded-[8px] px-[16px] py-[11px] text-[14px] font-semibold disabled:opacity-50 sm:w-auto sm:py-[10px]`}
          >
            {stage.state === "complete" ? "Reopen stage" : "Mark as complete"}
          </button>
        </div>
      )}
    </div>
  );
}
