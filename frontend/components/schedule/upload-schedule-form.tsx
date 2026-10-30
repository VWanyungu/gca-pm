"use client";

import { useRef, useState } from "react";
import { ArrowLeft, LoaderCircle, Upload } from "lucide-react";
import { formatLongDateTime, type ScheduleVersion, type ScopeMode } from "./types";
import type { TeamMember } from "@/components/project-overview/types";

function uploaderName(userId: string, team: TeamMember[]) {
  const member = team.find((m) => m.user_id === userId);
  return member ? `${member.first_name} ${member.last_name}` : "—";
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface UploadDraft {
  file: File;
  scopeMode: ScopeMode;
  rebaseline: boolean;
  notes: string;
}

/** AC-SCH-07: every task is stored whatever is chosen here; this only sets the default
 *  filter the schedule is read through afterwards. */
const SCOPE_OPTIONS: { value: ScopeMode; label: string; hint: string }[] = [
  { value: "every_task", label: "Full project", hint: "Every task in the file" },
  { value: "milestones_only", label: "Milestones", hint: "Milestone tasks only" },
  { value: "current_stage", label: "Current stage", hint: "" },
];

interface UploadScheduleFormProps {
  currentVersion?: ScheduleVersion;
  currentStageName?: string;
  team: TeamMember[];
  onCancel: () => void;
  onSubmit: (draft: UploadDraft) => void;
  /** True while the file is being sent, so the button cannot be pressed twice. */
  submitting?: boolean;
}

export function UploadScheduleForm({
  currentVersion,
  currentStageName,
  team,
  onCancel,
  onSubmit,
  submitting = false,
}: UploadScheduleFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [scopeMode, setScopeMode] = useState<ScopeMode>("every_task");
  const [rebaseline, setRebaseline] = useState(false);
  const [notes, setNotes] = useState("");
  const [confirmingRebaseline, setConfirmingRebaseline] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleUploadClick() {
    if (!file) return;
    if (rebaseline) {
      setConfirmingRebaseline(true);
      return;
    }
    onSubmit({ file, scopeMode, rebaseline, notes: notes.trim() });
  }

  return (
    <div className="flex w-full flex-col gap-[24px]">
      <button
        onClick={onCancel}
        className="flex w-fit cursor-pointer items-center gap-[6px] text-[13px] font-medium text-gca-green"
      >
        <ArrowLeft className="size-[16px]" />
        Schedule
      </button>

      <div>
        <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
          Upload schedule
        </h1>
        <p className="mt-[2px] text-[13px] text-gca-show">
          {currentVersion
            ? `Current version v${currentVersion.version_no} · uploaded ${formatLongDateTime(currentVersion.uploaded_at)} by ${uploaderName(currentVersion.uploaded_by, team)}`
            : "No schedule uploaded yet"}
        </p>
      </div>

      <div className="flex w-full flex-col items-start gap-[16px] border-t border-gca-border pt-[24px] lg:flex-row lg:gap-[48px]">
        <div className="w-full shrink-0 lg:w-[280px]">
          <p className="text-[14px] font-semibold text-gca-dark">File</p>
          <p className="mt-[4px] text-[13px] text-gca-show">
            The latest MS Project schedule (.mpp).
          </p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[8px]">
          <input
            ref={inputRef}
            type="file"
            accept=".mpp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex w-full items-center justify-between rounded-[8px] border border-gca-border px-[16px] py-[12px]">
              <div className="flex items-center gap-[12px]">
                <span className="flex size-[32px] items-center justify-center rounded-[6px] bg-gca-page-bg text-[11px] font-semibold text-gca-show">
                  .mpp
                </span>
                <div>
                  <p className="text-[14px] font-medium text-gca-dark">{file.name}</p>
                  <p className="text-[12px] text-gca-show">{formatSize(file.size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-[16px] text-[13px] font-medium">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="cursor-pointer text-gca-green hover:underline"
                >
                  Replace
                </button>
                <button
                  onClick={() => setFile(null)}
                  className="cursor-pointer text-error-text hover:underline"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full cursor-pointer flex-col items-center justify-center gap-[8px] rounded-[8px] border border-dashed border-gca-border bg-gca-page-bg py-[32px] text-[14px] text-gca-show hover:border-gca-green"
            >
              <Upload className="size-[18px]" />
              Click to choose a file
            </button>
          )}
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-[16px] border-t border-gca-border pt-[24px] lg:flex-row lg:gap-[48px]">
        <div className="w-full shrink-0 lg:w-[280px]">
          <p className="text-[14px] font-semibold text-gca-dark">Scope mode</p>
          <p className="mt-[4px] text-[13px] text-gca-show">How much of the file to read.</p>
        </div>
        <div className="flex w-full max-w-[792px] flex-col gap-[16px] sm:flex-row">
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => setScopeMode(option.value)}
              className={`flex-1 cursor-pointer rounded-[8px] border px-[16px] py-[14px] text-left ${
                scopeMode === option.value
                  ? "border-gca-green bg-gca-badge-bg"
                  : "border-gca-border"
              }`}
            >
              <p className="text-[14px] font-medium text-gca-dark">{option.label}</p>
              <p className="mt-[2px] text-[13px] text-gca-show">
                {option.value === "current_stage"
                  ? (currentStageName ?? "Active stage") + " tasks only"
                  : option.hint}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-full flex-col items-start gap-[16px] border-t border-gca-border pt-[24px] lg:flex-row lg:gap-[48px]">
        <div className="w-full shrink-0 lg:w-[280px]">
          <p className="text-[14px] font-semibold text-gca-dark">Rebaseline</p>
          <p className="mt-[4px] text-[13px] text-gca-show">Makes this version the new plan.</p>
        </div>
        {/* <label className="flex w-full max-w-[792px] cursor-pointer items-start gap-[10px] rounded-[8px] bg-gca-page-bg px-[16px] py-[14px]">
          <input
            type="checkbox"
            checked={rebaseline}
            onChange={(e) => setRebaseline(e.target.checked)}
            className="mt-[3px]"
          />
          <div>
            <p className="text-[14px] font-medium text-gca-dark">Rebaseline with this upload</p>
          </div>
        </label> */}
        <button
          onClick={() => setRebaseline(!rebaseline)}
          className="flex gap-[10px] text-left disabled:cursor-default w-full max-w-[792px] cursor-pointer items-start gap-[10px] rounded-[8px] bg-gca-page-bg px-[16px] py-[14px]"
        >
          <span
            className={`flex size-[18px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] ${
              rebaseline ? "border-gca-green bg-gca-green" : "border-gca-border bg-gca-surface"
            }`}
          >
            {rebaseline && (
              <svg viewBox="0 0 10 8" className="size-[10px]" fill="none">
                <path
                  d="M1 4L3.5 6.5L9 1"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>
          <span className={`text-[13px] ${rebaseline ? "text-gca-show" : "text-gca-dark"}`}>
            Rebaseline with this upload
          </span>
        </button>
      </div>

      <div className="flex w-full flex-col items-start gap-[16px] border-t border-gca-border pt-[24px] lg:flex-row lg:gap-[48px]">
        <div className="w-full shrink-0 lg:w-[280px]">
          <p className="text-[14px] font-semibold text-gca-dark">Notes</p>
          <p className="mt-[4px] text-[13px] text-gca-show">Optional commentary</p>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          // placeholder="Optional"
          rows={4}
          className="w-full max-w-[792px] rounded-[8px] border border-gca-border px-[13px] py-[11px] text-[14px] outline-none focus:border-gca-green"
        />
      </div>

      <div className="flex w-full items-center justify-between pt-[20px]">
        {/* <p className="text-[13px] text-gca-show">Processing usually takes under a minute.</p> */}
        {/* <div className="flex items-center justify-between gap-[16px]"> */}
        <button
          onClick={onCancel}
          className="cursor-pointer text-[14px] font-medium text-gca-show hover:text-red-500"
        >
          Cancel
        </button>
        <button
          onClick={handleUploadClick}
          disabled={!file || submitting}
          aria-label={submitting ? "Uploading" : undefined}
          className="cursor-pointer flex min-w-[80px] items-center justify-center gap-[8px] rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" />
          ) : (
            <>
              {/* <Upload className="size-[14px]" /> */}
              Upload
            </>
          )}
        </button>
        {/* </div> */}
      </div>

      {confirmingRebaseline && file && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-[rgba(24,48,31,0.45)]"
            onClick={() => setConfirmingRebaseline(false)}
          />
          <div className="relative m-6 md:m-0 w-[392px] max-w-full rounded-[12px] bg-gca-surface p-[24px] shadow-[0px_12px_32px_0px_rgba(23,48,31,0.08)]">
            <h2 className="text-[18px] font-semibold text-gca-dark">
              Are you sure you want to rebaseline?
            </h2>
            <p className="mt-[8px] text-[14px] text-gca-muted">
              Rebaselining makes this version the new plan.
            </p>
            <div className="mt-[24px] flex justify-end gap-[12px]">
              <button
                onClick={() => setConfirmingRebaseline(false)}
                className="rounded-[8px] border border-gca-border bg-gca-surface px-[16px] py-[10px] text-[14px] font-medium text-gca-dark"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setConfirmingRebaseline(false);
                  onSubmit({ file, scopeMode, rebaseline, notes: notes.trim() });
                }}
                className="rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-medium text-gca-on-accent"
              >
                Rebaseline
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
