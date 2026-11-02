"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Download, LoaderCircle, Paperclip } from "lucide-react";
import { api } from "@/lib/api-client";
import { useActivity, useActivityAttachments, useStageViewInvalidate } from "./use-stage-view-data";
import type { TeamMember } from "@/components/project-overview/types";

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function personName(userId: string | null | undefined, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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

export function ActivityDetail({
  projectId,
  stageNo,
  activityId,
  team,
  canManage,
  onBack,
  onEdit,
}: ActivityDetailProps) {
  const { data: activity } = useActivity(projectId, activityId);
  const { data: attachments = [] } = useActivityAttachments(projectId, activityId);
  const invalidate = useStageViewInvalidate(projectId, stageNo);
  const [togglingDone, setTogglingDone] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!activity) return null;

  async function toggleDone() {
    if (!activity) return;
    setTogglingDone(true);
    try {
      await api.patch(`/projects/${projectId}/stage-activities/${activityId}`, {
        status: activity.status === "done" ? "open" : "done",
      });
      invalidate();
    } finally {
      setTogglingDone(false);
    }
  }

  async function uploadAttachment(file: File) {
    setUploading(true);
    try {
      const dataUri = await fileToDataUri(file);
      await api.post(`/projects/${projectId}/stage-activities/${activityId}/attachments`, {
        file: dataUri,
        caption: file.name,
      });
      invalidate();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[12px] border border-gca-border bg-gca-surface p-[24px]">
      <button
        onClick={onBack}
        className=" cursor-pointer flex items-center gap-[8px] text-[13px] font-medium text-gca-green"
      >
        <ArrowLeft className="size-[18]" />
        All activities
      </button>

      <div className="flex items-start justify-between">
        <p className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">
          {activity.title}
        </p>
        {canManage && (
          <div className="flex items-center gap-[12px]">
            <button
              onClick={onEdit}
              className="cursor-pointer rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
            >
              Edit
            </button>
            <button
              onClick={toggleDone}
              disabled={togglingDone}
              className={`${activity.status === "done" ? "border border-gca-green text-gca-dark hover:text-gca-green" : "bg-gca-green hover:bg-gca-green-hover text-gca-on-accent"} relative flex cursor-pointer items-center justify-center gap-[8px] rounded-[8px] px-[16px] py-[10px] text-[14px] font-semibold disabled:opacity-60`}
            >
              <span className={togglingDone ? "invisible" : undefined}>
                {activity.status === "done" ? "Mark open" : "Mark done"}
              </span>
              {togglingDone && (
                <LoaderCircle
                  className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                  aria-label={activity.status === "done" ? "Marking open" : "Marking done"}
                />
              )}
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

      {(attachments.length > 0 || canManage) && (
        <div className="flex flex-col gap-[6px] border-t border-gca-border pt-[16px]">
          <p className="text-[14px] font-semibold text-gca-dark">
            Attachments
            {activity.requires_attachment && attachments.length === 0 && (
              <span className="ml-[8px] text-[12px] font-normal text-error-text">
                Required before this can be marked done
              </span>
            )}
          </p>
          {attachments.map((att) => (
            <div
              key={att.attachment_id}
              className="flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px] py-[10px]"
            >
              <Paperclip className="size-[14px] shrink-0 text-gca-muted" />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-gca-dark">
                {att.caption || "Attachment"}
              </span>
              <a
                href={att.access_url}
                target="_blank"
                rel="noopener noreferrer"
                download={att.caption || true}
                aria-label={`Download ${att.caption || "attachment"}`}
                className="flex size-[28px] shrink-0 items-center justify-center rounded-[6px] text-gca-show hover:bg-gca-page-bg hover:text-gca-dark"
              >
                <Download className="size-[14px]" />
              </a>
            </div>
          ))}
          {canManage && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadAttachment(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative flex w-fit cursor-pointer items-center gap-[8px] rounded-[8px] border border-gca-border bg-gca-surface px-[12px] py-[9px] text-[13px] font-medium text-gca-dark hover:bg-gca-page-bg disabled:opacity-60"
              >
                <Paperclip className={`size-[13px] ${uploading ? "invisible" : undefined}`} />
                <span className={uploading ? "invisible" : undefined}>Add attachment</span>
                {uploading && (
                  <LoaderCircle
                    className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                    aria-label="Uploading"
                  />
                )}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
