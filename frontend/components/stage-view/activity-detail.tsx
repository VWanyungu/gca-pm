"use client";

import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { useActivity, useActivityAttachments, useStageViewInvalidate } from "./use-stage-view-data";
import type { TeamMember } from "@/components/project-overview/types";

function personName(userId: string | null | undefined, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

interface ActivityDetailProps {
  projectId: string;
  stageNo: number;
  activityId: string;
  team: TeamMember[];
  canManage: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function ActivityDetail({ projectId, stageNo, activityId, team, canManage, onBack, onEdit }: ActivityDetailProps) {
  const { data: activity } = useActivity(projectId, activityId);
  const { data: attachments = [] } = useActivityAttachments(projectId, activityId);
  const invalidate = useStageViewInvalidate(projectId, stageNo);

  if (!activity) return null;

  async function toggleDone() {
    if (!activity) return;
    await api.patch(`/projects/${projectId}/stage-activities/${activityId}`, {
      status: activity.status === "done" ? "open" : "done",
    });
    invalidate();
  }

  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[12px] border border-gca-border bg-white p-[24px]">
      <button onClick={onBack} className="flex items-center gap-[8px] text-[13px] font-medium text-gca-green">
        <ArrowLeft className="size-[13px]" />
        All activities
      </button>

      <div className="flex items-start justify-between">
        <p className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">{activity.title}</p>
        {canManage && (
          <div className="flex items-center gap-[12px]">
            <button
              onClick={onEdit}
              className="rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
            >
              Edit
            </button>
            <button
              onClick={toggleDone}
              className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover"
            >
              {activity.status === "done" ? "Mark open" : "Mark done"}
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-[10px] text-[13px]">
        <div className="flex gap-[16px]">
          <span className="w-[140px] shrink-0 text-gca-show">Owner</span>
          <span className="font-medium text-gca-dark">{personName(activity.owner_id, team)}</span>
        </div>
        <div className="flex gap-[16px]">
          <span className="w-[140px] shrink-0 text-gca-show">Due</span>
          <span className="font-medium text-gca-dark">
            {activity.due_date ? formatDate(activity.due_date) : "—"}
          </span>
        </div>
        <div className="flex gap-[16px]">
          <span className="w-[140px] shrink-0 text-gca-show">Created</span>
          <span className="font-medium text-gca-dark">
            {personName(activity.created_by, team)}
            {activity.created_at ? ` · ${formatDate(activity.created_at)}` : ""}
          </span>
        </div>
      </div>

      {activity.description && (
        <div className="flex flex-col gap-[6px] border-t border-gca-border pt-[16px]">
          <p className="text-[14px] font-semibold text-gca-dark">Description</p>
          <p className="text-[14px] text-gca-dark">{activity.description}</p>
        </div>
      )}

      {attachments.length > 0 && (
        <div className="flex flex-col gap-[6px]">
          <p className="text-[14px] font-semibold text-gca-dark">Attachments</p>
          {attachments.map((att) => (
            <a
              key={att.attachment_id}
              href={att.attachment_id}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-[8px] border border-gca-border bg-white px-[12px] py-[10px]"
            >
              <span className="text-[13px] font-medium text-gca-dark">{att.caption || "Attachment"}</span>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
