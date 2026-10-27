"use client";

import { formatLongDateTime } from "./types";

interface StatTileProps {
  label: string;
  value: string | number;
  note?: string;
  emphasize?: boolean;
}

function StatTile({ label, value, note, emphasize }: StatTileProps) {
  return (
    <div className="flex flex-1 flex-col gap-[4px] rounded-[10px] border border-gca-border p-[16px]">
      <p className="text-[13px] text-gca-show">{label}</p>
      <p className={`text-[24px] font-semibold ${emphasize ? "text-error-text" : "text-gca-dark"}`}>
        {value}
      </p>
      {note && <p className="text-[12px] text-gca-show">{note}</p>}
    </div>
  );
}

interface UploadResultViewProps {
  /** Tasks whose dates or other stored fields changed in this version (AC-SCH-06). */
  datesMoved: number;
  fileName: string;
  uploadedAt: string;
  taskCount: number;
  overdueCount: number;
  flagCount: number;
  onViewChanges: () => void;
  onViewSchedule: () => void;
}

/** No MPP parsing service exists yet, so this is a preview of the result screen using the
 *  project's real current schedule data rather than fabricated upload numbers. */
export function UploadResultView({
  fileName,
  datesMoved,
  uploadedAt,
  taskCount,
  overdueCount,
  flagCount,
  onViewChanges,
  onViewSchedule,
}: UploadResultViewProps) {
  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
            Upload received
          </h1>
          <p className="mt-[2px] text-[13px] text-gca-show">
            {formatLongDateTime(uploadedAt)} · {fileName}
          </p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button
            onClick={onViewChanges}
            className="cursor-pointer rounded-[8px] border border-gca-border px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
          >
            View changes
          </button>
          <button
            onClick={onViewSchedule}
            className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover"
          >
            View schedule
          </button>
        </div>
      </div>

      <div className="grid w-full grid-cols-2 gap-[12px] lg:flex lg:gap-[16px]">
        <StatTile label="Tasks" value={taskCount} />
        <StatTile label="Dates moved" value={datesMoved} note="vs previous version" />
        <StatTile
          label="Overdue tasks"
          value={overdueCount}
          note="Review on the Overdue tab"
          emphasize={overdueCount > 0}
        />
        <StatTile label="Reconciliation flags" value={flagCount} note="From DPR progress" />
      </div>
    </div>
  );
}

export interface UploadProblem {
  task: string;
  problem: string;
  howToFix: string;
}

interface UploadFailedViewProps {
  fileName: string;
  fileSizeLabel: string;
  uploadedAt: string;
  problems: UploadProblem[];
  onDownloadReport: () => void;
  onUploadAgain: () => void;
}

/** Built to match the Figma design; only reachable once the real parsing service reports
 *  validation errors back — there's no client-side way to detect .mpp content problems. */
export function UploadFailedView({
  fileName,
  fileSizeLabel,
  uploadedAt,
  problems,
  onDownloadReport,
  onUploadAgain,
}: UploadFailedViewProps) {
  return (
    <div className="flex w-full flex-col gap-[20px]">
      <div className="flex w-full items-center justify-between">
        <div>
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">
            Upload didn&apos;t go through
          </h1>
          <p className="mt-[2px] text-[13px] text-gca-show">
            Nothing was saved. Fix these in MS Project and upload again.
          </p>
        </div>
        <div className="flex items-center gap-[12px]">
          <button
            onClick={onDownloadReport}
            className="cursor-pointer rounded-[8px] border border-gca-border px-[16px] py-[10px] text-[14px] font-semibold text-gca-dark hover:bg-gca-page-bg"
          >
            Download report
          </button>
          <button
            onClick={onUploadAgain}
            className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover"
          >
            Upload again
          </button>
        </div>
      </div>

      <div className="flex w-full items-center justify-between rounded-[8px] border border-gca-border px-[16px] py-[12px]">
        <div className="flex items-center gap-[12px]">
          <span className="flex size-[32px] items-center justify-center rounded-[6px] bg-gca-page-bg text-[11px] font-semibold text-gca-show">
            .mpp
          </span>
          <div>
            <p className="text-[14px] font-medium text-gca-dark">{fileName}</p>
            <p className="text-[12px] text-gca-show">
              {fileSizeLabel} · {formatLongDateTime(uploadedAt)}
            </p>
          </div>
        </div>
        <p className="text-[13px] font-semibold text-error-text">
          {problems.length} problem{problems.length === 1 ? "" : "s"}
        </p>
      </div>

      <div className="flex w-full flex-col rounded-[12px] border border-gca-border">
        <div className="flex w-full items-center gap-[10px] border-b border-gca-border bg-gca-surface px-[16px] py-[8px] text-[12px] font-medium text-gca-muted">
          <p className="w-[30%]">Task</p>
          <p className="w-[30%]">Problem</p>
          <p className="w-[40%]">How to fix</p>
        </div>
        {problems.map((p, i) => (
          <div
            key={i}
            className={`flex w-full items-center gap-[10px] px-[16px] py-[12px] ${i > 0 ? "border-t border-gca-border" : ""}`}
          >
            <p className="w-[30%] truncate text-[13px] font-medium text-gca-dark">{p.task}</p>
            <p className="w-[30%] text-[13px] text-gca-show">{p.problem}</p>
            <p className="w-[40%] text-[13px] text-gca-dark">{p.howToFix}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
