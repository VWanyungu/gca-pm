"use client";

import { useState } from "react";
import { ArrowLeft, LoaderCircle, Paperclip, Upload, X } from "lucide-react";
import { api } from "@/lib/api-client";
import Dropdown from "@/components/Dropdown";
import {
  useChangeRequestsInvalidate,
  uploadChangeRequestAttachment,
} from "./use-change-requests-data";
import type { ChangeRequest, ChangeRequestType } from "./types";
import type { StageRow } from "@/components/project-overview/types";

const MAX_ATTACHMENTS = 10;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

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
  const [costImpact, setCostImpact] = useState(
    editing?.cost_impact != null ? String(editing.cost_impact) : "",
  );
  const [stageNo, setStageNo] = useState(editing?.stage_no ? String(editing.stage_no) : "");
  const existingAttachments = editing?.attachments ?? [];
  const [newAttachments, setNewAttachments] = useState<
    { file_id: string; url: string; filename: string }[]
  >([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ title?: string; description?: string }>({});

  const stageOptions = stages
    .filter((s) => s.in_scope)
    .map((s) => ({ id: String(s.stage_no), name: s.stage_name }));

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const remaining = MAX_ATTACHMENTS - existingAttachments.length - newAttachments.length;
      for (const file of Array.from(files).slice(0, Math.max(0, remaining))) {
        const dataUrl = await fileToDataUrl(file);
        const { file_id, url } = await uploadChangeRequestAttachment(projectId, {
          file: dataUrl,
          filename: file.name,
        });
        setNewAttachments((current) => [...current, { file_id, url, filename: file.name }]);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Could not upload file");
    } finally {
      setUploading(false);
    }
  }

  function removeNewAttachment(fileId: string) {
    setNewAttachments((current) => current.filter((a) => a.file_id !== fileId));
  }

  async function submit() {
    const nextErrors = {
      title: title.trim() ? undefined : "Title is required",
      description: description.trim() ? undefined : "Description is required",
    };
    setFieldErrors(nextErrors);
    if (nextErrors.title || nextErrors.description) {
      return;
    }
    setSaving(true);

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
    if (newAttachments.length > 0) {
      body.attachment_file_ids = newAttachments.map((a) => a.file_id);
    }

    const res = editing
      ? await api.patch(`/projects/${projectId}/change-requests/${editing.change_id}`, body)
      : await api.post(`/projects/${projectId}/change-requests`, body);

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
        Change requests
      </button>

      <div>
        <h2 className="text-[20px] font-semibold text-gca-dark">
          {editing ? "Edit change request" : "Raise change request"}
        </h2>
        <p className="mt-[2px] text-[13px] text-gca-show">{projectName}</p>
      </div>

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
              onChange={(e) => {
                setTitle(e.target.value);
                setFieldErrors((current) => ({ ...current, title: undefined }));
              }}
              aria-invalid={!!fieldErrors.title}
              placeholder="e.g. Meter spec change"
              className={`h-[40px] rounded-[8px] border px-[13px] text-[14px] outline-none focus:border-gca-green ${
                fieldErrors.title ? "border-error-border" : "border-gca-border"
              }`}
            />
            {fieldErrors.title && (
              <span className="text-[12px] text-error-text">{fieldErrors.title}</span>
            )}
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
                      ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
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
              onChange={(e) => {
                setDescription(e.target.value);
                setFieldErrors((current) => ({ ...current, description: undefined }));
              }}
              aria-invalid={!!fieldErrors.description}
              placeholder="What is changing and why?"
              rows={4}
              className={`rounded-[8px] border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green ${
                fieldErrors.description ? "border-error-border" : "border-gca-border"
              }`}
            />
            {fieldErrors.description && (
              <span className="text-[12px] text-error-text">{fieldErrors.description}</span>
            )}
          </div>
        </div>
      </div>

      <div className="flex w-full items-start gap-[48px] border-t border-gca-border pt-[24px]">
        <div className="w-[280px] shrink-0">
          <p className="text-[14px] font-semibold text-gca-dark">Impact</p>
          <p className="mt-[4px] text-[13px] text-gca-show">Your best estimate is fine.</p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px]">
          <div className="flex flex-col gap-[16px] sm:flex-row">
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
        <div className="flex w-full max-w-[792px] flex-col gap-[12px]">
          {(existingAttachments.length > 0 || newAttachments.length > 0) && (
            <ul className="flex flex-col gap-[6px]">
              {existingAttachments.map((a) => (
                <li
                  key={a.attachment_id}
                  className="flex items-center gap-[8px] rounded-[8px] border border-gca-border px-[12px] py-[8px] text-[13px] text-gca-dark"
                >
                  <Paperclip className="size-[14px] shrink-0 text-gca-muted" />
                  <a
                    href={a.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate hover:underline"
                  >
                    {a.original_filename}
                  </a>
                </li>
              ))}
              {newAttachments.map((a) => (
                <li
                  key={a.file_id}
                  className="flex items-center gap-[8px] rounded-[8px] border border-gca-border px-[12px] py-[8px] text-[13px] text-gca-dark"
                >
                  <Paperclip className="size-[14px] shrink-0 text-gca-muted" />
                  <span className="flex-1 truncate">{a.filename}</span>
                  <button
                    type="button"
                    onClick={() => removeNewAttachment(a.file_id)}
                    aria-label={`Remove ${a.filename}`}
                    className="cursor-pointer text-gca-muted hover:text-error-text"
                  >
                    <X className="size-[14px]" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="flex w-full cursor-pointer flex-col items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-gca-border bg-gca-page-bg py-[32px] text-[14px] text-gca-show">
            {uploading ? (
              <LoaderCircle className="size-[18px] animate-spin text-gca-muted" />
            ) : (
              <Upload className="size-[18px] text-gca-muted" />
            )}
            <span>
              Drop a file or <span className="font-semibold text-gca-green">browse</span>
            </span>
            <input
              type="file"
              multiple
              className="hidden"
              disabled={
                uploading || existingAttachments.length + newAttachments.length >= MAX_ATTACHMENTS
              }
              onChange={(e) => {
                void handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {uploadError && <span className="text-[12px] text-error-text">{uploadError}</span>}
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-[16px] border-t border-gca-border pt-[20px]">
        <p className="text-[13px] text-gca-muted">Approved on raising</p>
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
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
