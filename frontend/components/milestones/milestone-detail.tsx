"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import { useCustomMilestone } from "./use-milestones-data";
import { formatLongDate, milestoneStatus, sourceLabel, variance, type MilestoneRow } from "./types";
import { STAGE_SHORT_NAME, type TeamMember } from "@/components/project-overview/types";

function creatorName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

interface MilestoneDetailProps {
  projectId: string;
  milestone: MilestoneRow;
  team: TeamMember[];
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function MilestoneDetail({ projectId, milestone, team, canManage, onBack, onEdit }: MilestoneDetailProps) {
  const isCustom = milestone.source === "custom";
  const { data: custom } = useCustomMilestone(projectId, isCustom ? milestone.id : "");

  const status = milestoneStatus(milestone);
  const source = sourceLabel(milestone.source);
  const v = variance(milestone.slippage_days);

  return (
    <div className="flex w-full items-start gap-[20px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[16px] rounded-[12px] bg-gca-surface p-[24px]">
        <button
          onClick={onBack}
          className="cursor-pointer flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
        >
          <ArrowLeft className="size-[18]" />
          Milestones
        </button>

        <div className="flex items-start justify-between">
          <p className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">{milestone.title}</p>
          {canManage && isCustom && (
            <button
              onClick={onEdit}
              className="cursor-pointer flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
            >
              <Pencil className="size-[14px]" />
              Edit
            </button>
          )}
        </div>

        <div className="flex flex-col gap-[4px] border-t border-gca-border pt-[16px]">
          <p className="text-[14px] font-semibold text-gca-dark">Notes</p>
          <p className="text-[14px] text-gca-dark">
            {isCustom ? custom?.notes || "No notes recorded." : "Schedule milestones don't have notes."}
          </p>
        </div>
      </div>

      <div className="flex w-[320px] shrink-0 flex-col gap-[12px] rounded-[12px] bg-gca-page-bg p-[20px]">
        <p className="text-[14px] font-semibold text-gca-dark">Details</p>
        <div className="flex flex-col gap-[10px] text-[13px]">
          <Row label="Source" value={source.label} valueClassName={source.className} />
          <Row label="Status" value={status.label} valueClassName={status.className} />
          {milestone.stage_no && <Row label="Stage" value={STAGE_SHORT_NAME[milestone.stage_no] ?? String(milestone.stage_no)} />}
          <Row label="Planned" value={formatLongDate(milestone.planned_date)} />
          {milestone.forecast_date && <Row label="Forecast" value={formatLongDate(milestone.forecast_date)} />}
          {milestone.actual_date && <Row label="Actual" value={formatLongDate(milestone.actual_date)} />}
          <Row label="Variance" value={v.label} valueClassName={v.className} />
          {isCustom && custom && <Row label="Added by" value={creatorName(custom.created_by, team)} />}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueClassName }: { label: string; value: string; valueClassName?: string }) {
  return (
    <div className="flex items-center justify-between gap-[12px]">
      <span className="text-gca-show">{label}</span>
      <span className={`font-semibold ${valueClassName ?? "text-gca-dark"}`}>{value}</span>
    </div>
  );
}
