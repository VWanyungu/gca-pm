"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";
import { useRiskCategories, useRisksInvalidate } from "./use-risks-data";
import {
  LIKELIHOOD_IMPACT_LEVELS,
  STATUS_OPTION_LABEL,
  STATUS_TRANSITIONS,
  formatLongDate,
  ratingFromScore,
  type Risk,
  type RiskStatus,
} from "./types";
import { uniquePeople, type StageRow, TeamMember } from "@/components/project-overview/types";

function creatorName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

interface RiskFormProps {
  projectId: string;
  projectName: string;
  stages: StageRow[];
  team: TeamMember[];
  editing?: Risk;
  /** Prefill for "new risk from X" flows (e.g. an overdue schedule task) — ignored when `editing` is set.
   *  `sourceTaskId` links the new risk back to the schedule task it came from, which is what
   *  lets the Overdue tab show that the task is already covered. */
  initial?: {
    title: string;
    description?: string;
    stageNo?: number;
    subtitle?: string;
    sourceTaskId?: string;
  };
  onDone: () => void;
  onCancel: () => void;
}

export function RiskForm({
  projectId,
  projectName,
  stages,
  team,
  editing,
  initial,
  onDone,
  onCancel,
}: RiskFormProps) {
  const { data: categories = [] } = useRiskCategories(projectId);
  const invalidate = useRisksInvalidate(projectId);

  const [title, setTitle] = useState(editing?.title ?? initial?.title ?? "");
  const [description, setDescription] = useState(
    editing?.description ?? initial?.description ?? "",
  );
  const [stageNo, setStageNo] = useState(
    editing?.stage_no ? String(editing.stage_no) : initial?.stageNo ? String(initial.stageNo) : "",
  );
  const [ownerId, setOwnerId] = useState(editing?.owner_id ?? "");
  const [categoryId, setCategoryId] = useState(
    editing?.category_id ? String(editing.category_id) : "",
  );
  const [reviewBy, setReviewBy] = useState(editing?.review_by?.slice(0, 10) ?? "");
  const [likelihood, setLikelihood] = useState(editing?.likelihood ?? 3);
  const [impact, setImpact] = useState(editing?.impact ?? 3);
  const [mitigation, setMitigation] = useState(editing?.mitigation ?? "");
  const [status, setStatus] = useState<RiskStatus>(editing?.status ?? "open");
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    title?: string;
    ownerId?: string;
    categoryId?: string;
  }>({});
  const [deleting, setDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");

  const stageOptions = stages
    .filter((s) => s.in_scope)
    .map((s) => ({ id: String(s.stage_no), name: s.stage_name }));
  const ownerOptions = uniquePeople(team).map((m) => ({
    id: m.user_id,
    name: `${m.first_name} ${m.last_name}`,
  }));
  const categoryOptions = categories.map((c) => ({ id: String(c.risk_category_id), name: c.name }));
  const statusOptions = editing
    ? [editing.status, ...STATUS_TRANSITIONS[editing.status]].map((s) => ({
        id: s,
        name: STATUS_OPTION_LABEL[s],
      }))
    : [];

  const rating = ratingFromScore(likelihood * impact);

  async function submit() {
    const nextErrors = {
      title: title.trim() ? undefined : "Title is required",
      ownerId: ownerId ? undefined : "Owner is required",
      categoryId: categoryId ? undefined : "Category is required",
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) {
      return;
    }
    setSaving(true);

    const body: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || null,
      stage_no: stageNo ? Number(stageNo) : null,
      owner_id: ownerId,
      category_id: Number(categoryId),
      review_by: reviewBy || null,
      likelihood,
      impact,
      mitigation: mitigation.trim() || null,
    };

    if (editing) {
      if (status !== editing.status) {
        body.status = status;
      }
      const res = await api.patch(`/projects/${projectId}/risks/${editing.risk_id}`, body);
      setSaving(false);
      if (res.status !== "success") return;
    } else {
      const res = await api.post(`/projects/${projectId}/risks`, {
        ...body,
        kind: "risk",
        source_task_id: initial?.sourceTaskId ?? null,
      });
      setSaving(false);
      if (res.status !== "success") return;
    }
    invalidate();
    onDone();
  }

  async function deleteRisk() {
    if (!editing || !deleteReason.trim()) return;
    setSaving(true);
    const res = await api.delete(`/projects/${projectId}/risks/${editing.risk_id}`, {
      reason: deleteReason.trim(),
    });
    setSaving(false);
    if (res.status !== "success") return;
    invalidate();
    onDone();
  }

  return (
    <div className="flex w-full flex-col gap-[24px] rounded-[12px] bg-gca-surface p-[24px]">
      <button
        onClick={onCancel}
        className="cursor-pointer flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
      >
        <ArrowLeft className="size-[18]" />
        Risks
      </button>

      <div>
        <h2 className="text-[20px] font-semibold text-gca-dark">
          {editing ? "Edit risk" : "New risk"}
        </h2>
        <p className="mt-[2px] text-[13px] text-gca-show">
          {editing
            ? `Raised ${formatLongDate(editing.opened_at)} by ${creatorName(editing.created_by, team)}`
            : (initial?.subtitle ?? projectName)}
        </p>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">What is the risk</p>
          <p className="mt-[4px] text-[13px] text-gca-show">
            Name it so the team can find it later.
          </p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Title<span className="text-error-text">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((current) => ({ ...current, title: undefined }));
              }}
              aria-invalid={!!fieldErrors.title}
              placeholder="e.g. Crane hire delay"
              className={`h-[40px] rounded-[8px] border px-[13px] text-[14px] outline-none focus:border-gca-green ${
                fieldErrors.title ? "border-error-border" : "border-gca-border"
              }`}
            />
            {fieldErrors.title && (
              <span className="text-[12px] text-error-text">{fieldErrors.title}</span>
            )}
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">Description</label>
            <textarea
              value={description ?? ""}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What could happen, and why?"
              rows={3}
              className="rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>
        </div>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Where it sits</p>
          <p className="mt-[4px] text-[13px] text-gca-show">
            Stage, owner and category decide who sees it.
          </p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[16px] sm:flex-row">
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Stage</label>
              <Dropdown
                id="risk-stage"
                title="Choose stage"
                data={stageOptions}
                selectedId={stageNo}
                style="h-[40px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px]"
                onSelect={(id) => setStageNo(id)}
              />
            </div>
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">
                Owner<span className="text-error-text">*</span>
              </label>
              <Dropdown
                id="risk-owner"
                title="Choose owner"
                data={ownerOptions}
                selectedId={ownerId}
                style={`h-[40px] w-full rounded-[8px] border px-[13px] text-[14px] ${
                  fieldErrors.ownerId ? "border-error-border" : "border-gca-border"
                }`}
                onSelect={(id) => {
                  setOwnerId(id);
                  setFieldErrors((current) => ({ ...current, ownerId: undefined }));
                }}
              />
              {fieldErrors.ownerId && (
                <span className="text-[12px] text-error-text">{fieldErrors.ownerId}</span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-[16px] sm:flex-row">
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">
                Category<span className="text-error-text">*</span>
              </label>
              <Dropdown
                id="risk-category"
                title="Choose category"
                data={categoryOptions}
                selectedId={categoryId}
                style={`h-[40px] w-full rounded-[8px] border px-[13px] text-[14px] ${
                  fieldErrors.categoryId ? "border-error-border" : "border-gca-border"
                }`}
                onSelect={(id) => {
                  setCategoryId(id);
                  setFieldErrors((current) => ({ ...current, categoryId: undefined }));
                }}
              />
              {fieldErrors.categoryId && (
                <span className="text-[12px] text-error-text">{fieldErrors.categoryId}</span>
              )}
            </div>
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Review by</label>
              <input
                type="date"
                value={reviewBy}
                onChange={(e) => setReviewBy(e.target.value)}
                className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
              />
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
          <div className="w-[280px] shrink-0">
            <p className="text-[14px] font-semibold text-gca-dark">Status</p>
            <p className="mt-[4px] text-[13px] text-gca-show">
              Closed risks stay visible and can be reopened.
            </p>
          </div>
          <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">
                Status<span className="text-error-text">*</span>
              </label>
              <Dropdown
                id="risk-status"
                data={statusOptions}
                selectedId={status}
                style="h-[40px] w-full max-w-[380px] rounded-[8px] border border-gca-border px-[13px] text-[14px]"
                onSelect={(id) => setStatus(id as RiskStatus)}
              />
            </div>
          </div>
        </div>
      )}

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Rating</p>
          <p className="mt-[4px] text-[13px] text-gca-show">
            Likelihood and impact set the rating.
          </p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[16px] sm:flex-row">
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Likelihood</label>
              <div className="flex gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
                {LIKELIHOOD_IMPACT_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => setLikelihood(lvl.value)}
                    className={`flex-1 cursor-pointer rounded-[6px] py-[7px] text-[13px] ${
                      likelihood === lvl.value
                        ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                        : "font-normal text-gca-show"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Impact</label>
              <div className="flex gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
                {LIKELIHOOD_IMPACT_LEVELS.map((lvl) => (
                  <button
                    key={lvl.value}
                    onClick={() => setImpact(lvl.value)}
                    className={`flex-1 cursor-pointer rounded-[6px] py-[7px] text-[13px] ${
                      impact === lvl.value
                        ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                        : "font-normal text-gca-show"
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <p className="text-[13px] text-gca-show">
            Rating <span className={`font-semibold ${rating.className}`}>{rating.label}</span>
          </p>
        </div>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Mitigation</p>
          <p className="mt-[4px] text-[13px] text-gca-show">
            What will reduce it. You can update this any time.
          </p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[6px]">
          <label className="text-[14px] text-gca-dark">Mitigation</label>
          <textarea
            value={mitigation ?? ""}
            onChange={(e) => setMitigation(e.target.value)}
            placeholder="Steps you will take"
            rows={3}
            className="rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
          />
        </div>
      </div>

      {deleting && (
        <div className="flex flex-col gap-[10px] rounded-[10px] bg-gca-page-bg p-[16px]">
          <label className="text-[13px] font-medium text-gca-dark">Reason for deleting</label>
          <textarea
            value={deleteReason}
            onChange={(e) => setDeleteReason(e.target.value)}
            rows={2}
            className="rounded-[8px] border border-gca-border bg-gca-surface px-[13px] py-[10px] text-[14px] outline-none focus:border-gca-green"
          />
          <div className="flex justify-end gap-[12px]">
            <button
              onClick={() => setDeleting(false)}
              className="cursor-pointer text-[13px] font-medium text-gca-show"
            >
              Cancel
            </button>
            <button
              onClick={deleteRisk}
              disabled={saving || !deleteReason.trim()}
              className="cursor-pointer rounded-[8px] bg-error-text px-[14px] py-[8px] text-[13px] font-semibold text-gca-on-accent disabled:opacity-50"
            >
              Confirm delete
            </button>
          </div>
        </div>
      )}

      <div className="flex w-full items-center justify-between gap-[16px] border-t border-gca-border pt-[20px]">
        {editing ? (
          <button
            onClick={() => setDeleting(true)}
            className="cursor-pointer text-[14px] font-medium text-error-text hover:text-red-700"
          >
            Delete risk
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-[16px]">
          <button
            onClick={onCancel}
            className="cursor-pointer hover:text-red-500 text-[14px] font-medium text-gca-show"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
          >
            {editing ? "Save changes" : "Save risk"}
          </button>
        </div>
      </div>
    </div>
  );
}
