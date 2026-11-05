"use client";

import { LoaderCircle, Plus, RefreshCw } from "lucide-react";
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
  doneCount: number;
  totalCount: number;
  canManage: boolean;
  hasChecklist: boolean;
  onAddChecklist: () => void;
  onToggleComplete: () => void;
  togglingComplete: boolean;
  onSync?: () => void;
  syncing?: boolean;
}

const GATE_LABEL: Record<string, string> = {
  kickoff: "Project kickoff",
  closure: "Project closure",
};

const GATE_TEXT_CLASS: Record<string, string> = {
  kickoff: "text-blue-600/45",
  closure: "text-orange-600/45",
};

export function StageHeader({
  stage,
  stageNo,
  percentComplete,
  doneCount,
  totalCount,
  canManage,
  hasChecklist,
  onAddChecklist,
  onToggleComplete,
  togglingComplete,
  onSync,
  syncing,
}: StageHeaderProps) {
  const isGateStage = stage.kind !== "pdm";
  const subtitle = STATE_SUBTITLE[stage.state](
    percentComplete,
    formatDate(stage.state === "complete" ? stage.last_changed_at : stage.added_to_scope_at),
  );

  return (
    // The stage number leads as a label rather than sitting inside the heading: a long
    // stage name wrapped to three lines under "Stage 8 :" and collided with the actions.
    <div className="flex w-full flex-col gap-[16px] lg:flex-row lg:items-start lg:justify-between">
      <div className="flex min-w-0 flex-col gap-[4px]">
        <p
          className={`text-[12px] font-semibold uppercase tracking-[0.06em] ${
            isGateStage ? GATE_TEXT_CLASS[stage.kind] : "text-gca-muted"
          }`}
        >
          {/* {isGateStage ? GATE_LABEL[stage.kind] : `Stage ${stageNo}`} */}
          {isGateStage ? "" : `Stage ${stageNo}`}
        </p>
        <h1 className="text-[22px] font-semibold tracking-[-0.33px] text-gca-dark text-balance">
          {isGateStage ? GATE_LABEL[stage.kind] : stage.stage_name}
        </h1>
        <p className="text-[13px] text-gca-show">
          {/* isGateStage ? `${doneCount} of ${totalCount} activities done` : subtitle */}
          {isGateStage ? `` : subtitle}
        </p>
      </div>
      {canManage && (
        <div className="flex shrink-0 flex-col gap-[10px] sm:flex-row sm:items-center sm:gap-[12px]">
          {isGateStage && onSync && (
            <button
              onClick={onSync}
              disabled={syncing}
              aria-label="Refetch activities from templates"
              title="Refetch activities from templates"
              className="flex size-[40px] shrink-0 cursor-pointer items-center justify-center rounded-[8px] border border-gca-border bg-gca-surface text-gca-dark hover:bg-gca-page-bg disabled:opacity-50 sm:size-[38px]"
            >
              <RefreshCw className={`size-[16px] ${syncing ? "animate-spin" : ""}`} />
            </button>
          )}
          {!hasChecklist && (
            <button
              onClick={onAddChecklist}
              className="flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[11px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg sm:w-auto sm:py-[10px]"
            >
              <Plus className="size-[10px]" />
              Add a checklist
            </button>
          )}
          {!isGateStage && (
            <button
              onClick={onToggleComplete}
              disabled={stage.state === "not_started" || togglingComplete}
              className={`${stage.state === "complete" ? "border border-gca-green text-gca-dark hover:text-gca-green" : "bg-gca-green hover:bg-gca-green-hover text-gca-on-accent"} relative flex w-full cursor-pointer items-center justify-center gap-[8px] rounded-[8px] px-[16px] py-[11px] text-[14px] font-semibold disabled:opacity-50 sm:w-auto sm:py-[10px]`}
            >
              <span className={togglingComplete ? "invisible" : undefined}>
                {stage.state === "complete" ? "Reopen stage" : "Mark as complete"}
              </span>
              {togglingComplete && (
                <LoaderCircle
                  className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                  aria-label={stage.state === "complete" ? "Reopening stage" : "Marking complete"}
                />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
