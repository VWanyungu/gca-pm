"use client";

import { useState } from "react";
import { ArrowLeft, Upload } from "lucide-react";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";
import { useChangeRequestsInvalidate } from "./use-change-requests-data";
import type { ChangeRequest, ChangeRequestType } from "./types";
import type { StageRow } from "@/components/project-overview/types";

const TYPE_TABS: { id: ChangeRequestType; label: string }[] = [
  { id: "scope", label: "Scope" },
  { id: "schedule", label: "Schedule" },
  { id: "cost", label: "Cost" },
];

const DEFAULT_CURRENCY = "KES";

interface ChangeRequestFormProps {
  projectId: string;
  projectName: string;
  stages: StageRow[];
  editing?: ChangeRequest;
  onDone: () => void;
  onCancel: () => void;
}

export function ChangeRequestForm({
  projectId,
  projectName,
  stages,
  editing,
  onDone,
  onCancel,
}: ChangeRequestFormProps) {
  const invalidate = useChangeRequestsInvalidate(projectId);

  const [title, setTitle] = useState(editing?.title ?? "");
  const [type, setType] = useState<ChangeRequestType>(editing?.type ?? "scope");
  const [description, setDescription] = useState(editing?.scope_description ?? "");
  const [scheduleImpact, setScheduleImpact] = useState(
    editing?.schedule_impact_days != null ? String(editing.schedule_impact_days) : "",
  );
  const [costImpact, setCostImpact] = useState(editing?.cost_impact != null ? String(editing.cost_impact) : "");
  const [stageNo, setStageNo] = useState(editing?.stage_no ? String(editing.stage_no) : "");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stageOptions = stages.filter((s) => s.in_scope).map((s) => ({ id: String(s.stage_no), name: s.stage_name }));

  async function submit() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required");
      return;
    }
    setSaving(true);
    setError(null);

    const body: Record<string, unknown> = {
      title: title.trim(),
      type,
      scope_description: description.trim(),
      reason: description.trim(),
      schedule_impact_days: scheduleImpact.trim() ? Number(scheduleImpact) : null,
      cost_impact: costImpact.trim() ? Number(costImpact) : null,
      cost_currency: costImpact.trim() ? DEFAULT_CURRENCY : null,
      stage_no: stageNo ? Number(stageNo) : null,
    };

    const res = editing
      ? await api.patch(`/projects/${projectId}/change-requests/${editing.change_id}`, body)
      : await api.post(`/projects/${projectId}/change-requests`, body);

    setSaving(false);
    if (res.status !== "success") {
      setError(res.message || "Couldn't save the change request");
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
        Change requests
      </button>

      <div>
        <h2 className="text-[20px] font-semibold text-gca-dark">
          {editing ? "Edit change request" : "Raise change request"}
        </h2>
        <p className="mt-[2px] text-[13px] text-gca-show">{projectName}</p>
      </div>

      {error && <p className="rounded-[8px] bg-error-bg px-[14px] py-[10px] text-[13px] text-error-text">{error}</p>}

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Change</p>
          <p className="mt-[4px] text-[13px] text-gca-show">What is changing, and why.</p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Title<span className="text-error-text">*</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meter spec change"
              className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Type<span className="text-error-text">*</span>
            </label>
            <div className="flex w-full max-w-[380px] gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
              {TYPE_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setType(tab.id)}
                  className={`flex-1 cursor-pointer rounded-[6px] py-[7px] text-[13px] ${
                    type === tab.id
                      ? "bg-white font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                      : "font-normal text-gca-show"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">
              Description<span className="text-error-text">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is changing and why?"
              rows={4}
              className="rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
            />
          </div>
        </div>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Impact</p>
          <p className="mt-[4px] text-[13px] text-gca-show">Your best estimate is fine.</p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex gap-[16px]">
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Schedule impact</label>
              <input
                value={scheduleImpact}
                onChange={(e) => setScheduleImpact(e.target.value)}
                placeholder="+ days"
                type="number"
                className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
              />
            </div>
            <div className="flex w-full flex-col gap-[6px]">
              <label className="text-[14px] text-gca-dark">Cost impact</label>
              <input
                value={costImpact}
                onChange={(e) => setCostImpact(e.target.value)}
                placeholder="KES"
                type="number"
                className="h-[40px] rounded-[8px] border border-gca-border px-[13px] text-[14px] outline-none focus:border-gca-green"
              />
            </div>
          </div>
          <div className="flex flex-col gap-[6px]">
            <label className="text-[14px] text-gca-dark">Stage</label>
            <Dropdown
              id="cr-stage"
              title="Choose stage"
              data={stageOptions}
              selectedId={stageNo}
              style="h-[40px] w-full rounded-[8px] border border-gca-border px-[13px] text-[14px]"
              onSelect={(id) => setStageNo(id)}
            />
          </div>
        </div>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Supporting files</p>
          <p className="mt-[4px] text-[13px] text-gca-show">Quotes, drawings or client letters.</p>
        </div>
        {/* shortcut: file is kept client-side only, no upload endpoint exists yet for change requests; wire to SharePoint once the backend supports it */}
        <label className="flex w-full max-w-[792px] cursor-pointer flex-col items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-gca-border bg-gca-page-bg py-[32px] text-[14px] text-gca-show">
          <Upload className="size-[18px] text-gca-muted" />
          {file ? (
            <span className="text-gca-dark">{file.name}</span>
          ) : (
            <span>
              Drop a file or <span className="font-semibold text-gca-green">browse</span>
            </span>
          )}
          <input
            type="file"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      <div className="flex w-full items-center justify-between gap-[16px] border-t border-gca-border pt-[20px]">
        <p className="text-[13px] text-gca-muted">Goes to ExCo for the Tuesday review</p>
        <div className="flex items-center gap-[16px]">
          <button onClick={onCancel} className="cursor-pointer hover:text-red-500 text-[14px] font-medium text-gca-show">
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
