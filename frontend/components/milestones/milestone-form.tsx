"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";
import { useMilestonesInvalidate } from "./use-milestones-data";
import { formatInputDate, type CustomMilestone } from "./types";
import type { StageRow, TeamMember } from "@/components/project-overview/types";

const NO_STAGE_OPTION_ID = "__no-stage__";

function creatorName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

interface MilestoneFormProps {
  projectId: string;
  stages: StageRow[];
  team: TeamMember[];
  editing?: CustomMilestone;
  onDone: () => void;
  onCancel: () => void;
}

export function MilestoneForm({
  projectId,
  stages,
  team,
  editing,
  onDone,
  onCancel,
}: MilestoneFormProps) {
  const invalidate = useMilestonesInvalidate(projectId);

  const stageOptions = [
    { id: NO_STAGE_OPTION_ID, name: "No stage" },
    ...stages
      .filter((s) => s.in_scope)
      .map((s) => ({ id: String(s.stage_no), name: s.stage_name })),
  ];

  const [title, setTitle] = useState(editing?.title ?? "");
  const [plannedDate, setPlannedDate] = useState(formatInputDate(editing?.planned_date ?? null));
  const [actualDate, setActualDate] = useState(formatInputDate(editing?.actual_date ?? null));
  const [stageNo, setStageNo] = useState(() => {
    const initialStageNo = editing?.stage_no != null ? String(editing.stage_no) : "";
    return stageOptions.some((option) => option.id === initialStageNo) ? initialStageNo : "";
  });
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null);
  const saving = pendingAction !== null;
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; plannedDate?: string }>({});
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (stageNo && !stageOptions.some((option) => option.id === stageNo)) {
      setStageNo("");
    }
  }, [stageNo, stageOptions]);

  async function submit() {
    const nextErrors = {
      title: title.trim() ? undefined : "Name is required",
      plannedDate: plannedDate ? undefined : "Planned date is required",
    };
    setFieldErrors(nextErrors);
    if (nextErrors.title || nextErrors.plannedDate) {
      return;
    }
    setPendingAction("save");
    try {
      const body = {
        title: title.trim(),
        planned_date: plannedDate,
        stage_no: stageNo ? Number(stageNo) : null,
        notes: notes.trim() || null,
      };

      const res = editing
        ? await api.patch(`/projects/${projectId}/custom-milestones/${editing.milestone_id}`, {
            ...body,
            actual_date: actualDate || null,
          })
        : await api.post(`/projects/${projectId}/custom-milestones`, body);

      if (res.status !== "success") return;
      invalidate();
      onDone();
    } finally {
      setPendingAction(null);
    }
  }

  async function deleteMilestone() {
    if (!editing) return;
    setPendingAction("delete");
    try {
      const res = await api.delete(
        `/projects/${projectId}/custom-milestones/${editing.milestone_id}`,
      );
      if (res.status !== "success") return;
      invalidate();
      onDone();
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-[24px] rounded-[12px] bg-gca-surface p-[24px]">
      <button
        onClick={onCancel}
        className="cursor-pointer flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
      >
        <ArrowLeft className="size-[18]" />
        Milestones
      </button>

      <div>
        <h2 className="text-[20px] font-semibold text-gca-dark">
          {editing ? "Edit milestone" : "Add milestone"}
        </h2>
        <p className="mt-[2px] text-[13px] text-gca-show">
          {editing
            ? `Custom milestone · added by ${creatorName(editing.created_by, team)}`
            : "Custom milestones sit alongside the schedule."}
        </p>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Milestone</p>
          {/* <p className="mt-[4px] text-[13px] text-gca-show">Give it a clear name and date.</p> */}
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Name<span className="text-error-text">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((current) => ({ ...current, title: undefined }));
              }}
              aria-invalid={!!fieldErrors.title}
              placeholder="e.g. Client walkthrough"
              className={`h-[40px] rounded-[8px] border px-[13px] text-[14px] outline-none focus:border-gca-green ${
                fieldErrors.title ? "border-error-border" : "border-gca-border"
              }`}
            />
            {fieldErrors.title && (
              <span className="text-[12px] text-error-text">{fieldErrors.title}</span>
            )}
          </div>
          <div className="flex flex-col gap-[16px] sm:flex-row">
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">
                Planned Date<span className="text-error-text">*</span>
              </label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => {
                  setPlannedDate(e.target.value);
                  setFieldErrors((current) => ({ ...current, plannedDate: undefined }));
                }}
                aria-invalid={!!fieldErrors.plannedDate}
                className={`h-[40px] rounded-[8px] border px-[13px] text-[14px] outline-none focus:border-gca-green ${
                  fieldErrors.plannedDate ? "border-error-border" : "border-gca-border"
                }`}
              />
              {fieldErrors.plannedDate && (
                <span className="text-[12px] text-error-text">{fieldErrors.plannedDate}</span>
              )}
            </div>
            {editing && (
              <div className="flex w-full flex-col gap-[6px]">
                <label className="text-[14px] text-gca-dark">Date Completed</label>
                <input
                  type="date"
                  value={actualDate}
                  onChange={(e) => setActualDate(e.target.value)}
                  className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
                />
              </div>
            )}
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Stage</label>
              <Dropdown
                id="milestone-stage"
                title={stageOptions.find((s) => s.id === stageNo)?.name || "No stage"}
                data={stageOptions}
                selectedId={stageNo || NO_STAGE_OPTION_ID}
                style="h-[40px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px]"
                onSelect={(id) => setStageNo(id === NO_STAGE_OPTION_ID ? "" : id)}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Notes</p>
          <p className="mt-[4px] text-[13px] text-gca-show">Who is involved, what to prepare.</p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[6px]">
          <label className="text-[14px] text-gca-dark">Notes</label>
          <textarea
            value={notes ?? ""}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional"
            rows={3}
            className="rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
          />
        </div>
      </div>

      {deleting && (
        <div className="flex flex-col gap-[10px] rounded-[10px] bg-gca-page-bg p-[16px]">
          <p className="text-[13px] font-medium text-gca-dark">
            Delete this milestone? This can&apos;t be undone.
          </p>
          <div className="flex justify-end gap-[12px]">
            <button
              onClick={() => setDeleting(false)}
              className="cursor-pointer text-[13px] font-medium text-gca-show"
            >
              Cancel
            </button>
            <button
              onClick={deleteMilestone}
              disabled={saving}
              className="relative flex cursor-pointer items-center justify-center gap-[6px] rounded-[8px] bg-error-text px-[14px] py-[8px] text-[13px] font-semibold text-gca-on-accent disabled:opacity-50"
            >
              <span className={pendingAction === "delete" ? "invisible" : undefined}>
                Confirm delete
              </span>
              {pendingAction === "delete" && (
                <LoaderCircle
                  className="absolute left-1/2 top-1/2 size-[14px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                  aria-label="Deleting"
                />
              )}
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
            Delete milestone
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
            className="relative flex cursor-pointer items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
          >
            <span className={pendingAction === "save" ? "invisible" : undefined}>
              {editing ? "Save changes" : "Add milestone"}
            </span>
            {pendingAction === "save" && (
              <LoaderCircle
                className="absolute left-1/2 top-1/2 size-[16px] -translate-x-1/2 -translate-y-1/2 animate-spin"
                aria-label="Saving"
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
