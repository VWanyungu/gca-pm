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
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface StageHeaderProps {
  stage: StageDetail;
  percentComplete: number;
  canManage: boolean;
  hasChecklist: boolean;
  onAddChecklist: () => void;
  onToggleComplete: () => void;
}

export function StageHeader({
  stage,
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
    <div className="flex w-full items-start justify-between">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">{stage.stage_name}</h1>
        <p className="text-[13px] text-gca-show">{subtitle}</p>
      </div>
      {canManage && (
        <div className="flex items-center gap-[12px]">
          {!hasChecklist && (
            <button
              onClick={onAddChecklist}
              className="flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
            >
              <Plus className="size-[10px]" />
              Add a checklist
            </button>
          )}
          <button
            onClick={onToggleComplete}
            disabled={stage.state === "not_started"}
            className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
          >
            {stage.state === "complete" ? "Reopen stage" : "Mark as complete"}
          </button>
        </div>
      )}
    </div>
  );
}
