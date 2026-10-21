"use client";

import { useState } from "react";
import { ArrowLeft, Download, Paperclip, Pencil } from "lucide-react";
import { api } from "@/lib/api-client";
import { useChangeRequest, useChangeRequestsInvalidate } from "./use-change-requests-data";
import {
  TYPE_LABEL,
  daysSince,
  formatCostImpact,
  formatLongDate,
  formatScheduleImpact,
  statusInfo,
} from "./types";
import type { TeamMember, StageRow } from "@/components/project-overview/types";

function personName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

interface ChangeRequestDetailProps {
  projectId: string;
  changeId: string;
  team: TeamMember[];
  stages: StageRow[];
  currentUserId?: string;
  canRaise: boolean;
  canDecide: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function ChangeRequestDetail({
  projectId,
  changeId,
  team,
  stages,
  currentUserId,
  canRaise,
  canDecide,
  onBack,
  onEdit,
}: ChangeRequestDetailProps) {
  const { data: cr } = useChangeRequest(projectId, changeId);
  const invalidate = useChangeRequestsInvalidate(projectId);

  const [rejecting, setRejecting] = useState(false);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  if (!cr) return null;

  const status = statusInfo(cr.status);
  const stageName = cr.stage_no ? stages.find((s) => s.stage_no === cr.stage_no)?.stage_name : null;
  const isRaiser = !!currentUserId && currentUserId === cr.raised_by;
  const canEdit = canRaise && isRaiser && cr.status === "pending";
  const canWithdraw = canEdit;
  const canAct = canDecide && cr.status === "pending";

  async function decide(decision: "approve" | "reject") {
    if (decision === "reject" && !comment.trim()) {
      setRejecting(true);
      return;
    }
    setSaving(true);
    await api.post(`/projects/${projectId}/change-requests/${cr!.change_id}/decide`, {
      decision,
      comment: comment.trim() || undefined,
    });
    setSaving(false);
    setRejecting(false);
    invalidate();
  }

  async function withdraw() {
    setSaving(true);
    await api.post(`/projects/${projectId}/change-requests/${cr!.change_id}/withdraw`, {});
    setSaving(false);
    invalidate();
  }

  return (
    <div className="flex w-full items-start gap-[20px]">
      <div className="flex min-w-0 flex-1 flex-col gap-[16px] rounded-[12px] bg-white p-[24px]">
        <button
          onClick={onBack}
          className="cursor-pointer flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
        >
          <ArrowLeft className="size-[18]" />
          Change requests
        </button>

        <div className="flex items-start justify-between">
          <div>
            <p className="text-[20px] font-semibold tracking-[-0.3px] text-gca-dark">{cr.title}</p>
            <p className="mt-[4px] text-[13px] text-gca-show">
              Raised by {personName(cr.raised_by, team)} · {formatShortLabel(cr.raised_at)}{" "}
              <span className={`font-semibold ${status.className}`}>{status.label}</span>
            </p>
          </div>
          <div className="flex items-center gap-[12px]">
            {canEdit && (
              <button
                onClick={onEdit}
                className="cursor-pointer flex items-center gap-[8px] rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
              >
                <Pencil className="size-[14px]" />
                Edit
              </button>
            )}
            {canWithdraw && (
              <button
                onClick={withdraw}
                disabled={saving}
                className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg disabled:opacity-50"
              >
                Withdraw
              </button>
            )}
            {canAct && (
              <>
                <button
                  onClick={() => setRejecting((r) => !r)}
                  className="cursor-pointer rounded-[8px] border border-gca-border bg-white px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
                >
                  Reject
                </button>
                <button
                  onClick={() => decide("approve")}
                  disabled={saving}
                  className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
                >
                  Approve
                </button>
              </>
            )}
          </div>
        </div>

        {rejecting && (
          <div className="flex flex-col gap-[10px] rounded-[10px] bg-gca-page-bg p-[16px]">
            <label className="text-[13px] font-medium text-gca-dark">Reason for rejecting</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
              className="rounded-[8px] border border-gca-border bg-white px-[13px] py-[10px] text-[14px] outline-none focus:border-gca-green"
            />
            <div className="flex justify-end gap-[12px]">
              <button onClick={() => setRejecting(false)} className="cursor-pointer text-[13px] font-medium text-gca-show">
                Cancel
              </button>
              <button
                onClick={() => decide("reject")}
                disabled={saving || !comment.trim()}
                className="cursor-pointer rounded-[8px] bg-error-text px-[14px] py-[8px] text-[13px] font-semibold text-white disabled:opacity-50"
              >
                Confirm reject
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-[6px] border-t border-gca-border pt-[16px]">
          <p className="text-[14px] font-semibold text-gca-dark">Description</p>
          <p className="text-[14px] text-gca-dark">{cr.scope_description}</p>
        </div>

        {!!cr.attachments?.length && (
          <div className="flex flex-col gap-[8px] border-t border-gca-border pt-[16px]">
            <p className="text-[14px] font-semibold text-gca-dark">Supporting files</p>
            <ul className="flex flex-col gap-[6px]">
              {cr.attachments.map((a) => (
                <li
                  key={a.attachment_id}
                  className="flex items-center gap-[8px] rounded-[8px] border border-gca-border px-[12px] py-[8px] text-[13px]"
                >
                  <Paperclip className="size-[14px] shrink-0 text-gca-muted" />
                  <span className="min-w-0 flex-1 truncate text-gca-dark">{a.original_filename}</span>
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={a.original_filename}
                    aria-label={`Download ${a.original_filename}`}
                    className="flex size-[28px] shrink-0 items-center justify-center rounded-[6px] text-gca-show hover:bg-gca-page-bg hover:text-gca-dark"
                  >
                    <Download className="size-[14px]" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-[12px] border-t border-gca-border pt-[16px]">
          <p className="text-[14px] font-semibold text-gca-dark">Progress</p>
          <ProgressRow label="Raised" value={formatLongDate(cr.raised_at)} />
          {cr.status === "pending" ? (
            <ProgressRow label="ExCo review" value={`Waiting ${daysSince(cr.raised_at)} days`} />
          ) : cr.status === "withdrawn" ? (
            <ProgressRow label="Withdrawn" value={formatLongDate(cr.withdrawn_at)} />
          ) : cr.status === "noted" ? (
            <ProgressRow label="Noted" value="FYI — no approval needed" />
          ) : (
            <ProgressRow label="Decision" value={`${status.label} · ${formatLongDate(cr.decided_at)}`} />
          )}
        </div>

        {cr.status === "pending" && (
          <p className="text-[13px] text-gca-muted">The Planner can link this to a rebaseline on the next upload.</p>
        )}
      </div>

      <div className="flex w-[320px] shrink-0 flex-col gap-[12px] rounded-[12px] bg-gca-page-bg p-[20px]">
        <p className="text-[14px] font-semibold text-gca-dark">Details</p>
        <div className="flex flex-col gap-[10px] text-[13px]">
          <Row label="Status" value={status.label} valueClassName={status.className} />
          <Row label="Type" value={TYPE_LABEL[cr.type]} />
          {stageName && <Row label="Stage" value={stageName} />}
          <Row label="Schedule impact" value={formatScheduleImpact(cr.schedule_impact_days)} />
          <Row label="Cost impact" value={formatCostImpact(cr.cost_impact, cr.cost_currency)} />
          <Row label="Raised by" value={personName(cr.raised_by, team)} />
          <Row label="Raised" value={formatLongDate(cr.raised_at)} />
        </div>
      </div>
    </div>
  );
}

function formatShortLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function ProgressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-[2px]">
      <p className="text-[14px] font-medium text-gca-dark">{label}</p>
      <p className="text-[13px] text-gca-show">{value}</p>
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
