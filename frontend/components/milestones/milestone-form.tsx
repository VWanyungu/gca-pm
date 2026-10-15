"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";
import { useMilestonesInvalidate } from "./use-milestones-data";
import { formatInputDate, type CustomMilestone } from "./types";
import type { StageRow, TeamMember } from "@/components/project-overview/types";

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

export function MilestoneForm({ projectId, stages, team, editing, onDone, onCancel }: MilestoneFormProps) {
  const invalidate = useMilestonesInvalidate(projectId);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [plannedDate, setPlannedDate] = useState(formatInputDate(editing?.planned_date ?? null));
  const [stageNo, setStageNo] = useState(editing?.stage_no ? String(editing.stage_no) : "");
  const [notes, setNotes] = useState(editing?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const stageOptions = stages.filter((s) => s.in_scope).map((s) => ({ id: String(s.stage_no), name: s.stage_name }));

  async function submit() {
    if (!title.trim() || !plannedDate) {
      setError("Name and date are required");
      return;
    }
    setSaving(true);
    setError(null);

    const body = {
      title: title.trim(),
      planned_date: plannedDate,
      stage_no: stageNo ? Number(stageNo) : null,
      notes: notes.trim() || null,
    };

    const res = editing
      ? await api.patch(`/projects/${projectId}/custom-milestones/${editing.milestone_id}`, body)
      : await api.post(`/projects/${projectId}/custom-milestones`, body);

    setSaving(false);
    if (res.status !== "success") {
      setError(res.message || `Couldn't ${editing ? "save" : "add"} the milestone`);
      return;
    }
    invalidate();
    onDone();
  }

  async function deleteMilestone() {
    if (!editing) return;
    setSaving(true);
    const res = await api.delete(`/projects/${projectId}/custom-milestones/${editing.milestone_id}`);
    setSaving(false);
    if (res.status !== "success") {
      setError(res.message || "Couldn't delete the milestone");
      return;
    }
    invalidate();
    onDone();
  }

  return (
    <div className="flex w-full flex-col gap-[24px] rounded-[12px] bg-white p-[24px]">
      <button
        onClick={onCancel}
        className="cursor-pointer flex items-center gap-[6px] text-[13px] font-medium text-gca-green"
      >
        <ArrowLeft className="size-[18]" />
        Milestones
      </button>

      <div>
        <h2 className="text-[20px] font-semibold text-gca-dark">{editing ? "Edit milestone" : "Add milestone"}</h2>
        <p className="mt-[2px] text-[13px] text-gca-show">
          {editing
            ? `Custom milestone · added by ${creatorName(editing.created_by, team)}`
            : "Custom milestones sit alongside the schedule."}
        </p>
      </div>

      {error && (
        <p className="rounded-[8px] bg-error-bg px-[14px] py-[10px] text-[13px] text-error-text">{error}</p>
      )}

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Milestone</p>
          <p className="mt-[4px] text-[13px] text-gca-show">Give it a clear name and date.</p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Name<span className="text-error-text">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Client walkthrough"
              className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>
          <div className="flex gap-[16px]">
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">
                Date<span className="text-error-text">*</span>
              </label>
              <input
                type="date"
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
              />
            </div>
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Stage</label>
              <Dropdown
                id="milestone-stage"
                title="Optional"
                data={stageOptions}
                selectedId={stageNo}
                style="h-[40px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px]"
                onSelect={(id) => setStageNo(id)}
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
          <p className="text-[13px] font-medium text-gca-dark">Delete this milestone? This can&apos;t be undone.</p>
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
              className="cursor-pointer rounded-[8px] bg-error-text px-[14px] py-[8px] text-[13px] font-semibold text-white disabled:opacity-50"
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
            Delete milestone
          </button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-[16px]">
          <button onClick={onCancel} className="cursor-pointer hover:text-red-500 text-[14px] font-medium text-gca-show">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
          >
            {editing ? "Save changes" : "Add milestone"}
          </button>
        </div>
      </div>
    </div>
  );
}
