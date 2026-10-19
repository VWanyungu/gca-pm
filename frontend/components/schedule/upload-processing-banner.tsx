"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useScheduleVersion } from "./use-schedule-data";
import type { ParseDiagnostic, ScheduleVersion } from "./types";

const STEPS = [
  { key: "reading", label: "Reading file" },
  { key: "matching", label: "Matching tasks" },
  { key: "overdue", label: "Checking overdue tasks" },
  { key: "comparing", label: "Comparing with the current version" },
] as const;

const STEP_DURATION_MS = 700;

interface UploadProcessingBannerProps {
  projectId: string;
  versionId: string;
  fileName: string;
  fileSizeLabel: string;
  onCancel: () => void;
  onComplete: (version: ScheduleVersion) => void;
  onFailed: (diagnostics: ParseDiagnostic[]) => void;
}

/** Polls the queued version until the server finishes with it. The steps below are paced on a
 *  timer because the service reports a status rather than progress, but the last one only
 *  completes when the version really is applied — the banner never claims success on its own. */
export function UploadProcessingBanner({
  projectId,
  versionId,
  fileName,
  fileSizeLabel,
  onCancel,
  onComplete,
  onFailed,
}: UploadProcessingBannerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const { data: version } = useScheduleVersion(projectId, versionId);
  const settled = version?.status === "applied" || version?.status === "failed";

  useEffect(() => {
    // Hold on the last step while the server is still working.
    if (stepIndex >= STEPS.length - 1 && !settled) return;
    if (stepIndex >= STEPS.length) return;
    const id = setTimeout(() => setStepIndex((i) => i + 1), STEP_DURATION_MS);
    return () => clearTimeout(id);
  }, [stepIndex, settled]);

  useEffect(() => {
    if (version?.status === "applied") onComplete(version);
    if (version?.status === "failed") onFailed(version.parse_diagnostics ?? []);
  }, [version, onComplete, onFailed]);

  const progressPct = settled ? 100 : Math.min(90, (stepIndex / STEPS.length) * 100);

  return (
    <div className="flex w-full flex-col gap-[16px] rounded-[12px] border border-gca-border bg-white p-[20px]">
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-[12px]">
          <span className="flex size-[32px] items-center justify-center rounded-[6px] bg-gca-page-bg text-[11px] font-semibold text-gca-show">
            .mpp
          </span>
          <div>
            <p className="text-[14px] font-semibold text-gca-dark">Processing {fileName}</p>
            <p className="text-[12px] text-gca-show">
              {fileSizeLabel} · Usually takes under a minute. You can keep using the schedule.
            </p>
          </div>
        </div>
        <button onClick={onCancel} className="cursor-pointer text-[13px] font-medium text-gca-show hover:text-red-500">
          Cancel upload
        </button>
      </div>

      <div className="h-[4px] w-full overflow-hidden rounded-full bg-gca-page-bg">
        <div className="h-full rounded-full bg-gca-green transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      <div className="flex w-full items-center justify-between">
        {STEPS.map((step, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <div key={step.key} className="flex items-center gap-[8px]">
              {done ? (
                <span className="flex size-[18px] items-center justify-center rounded-full bg-gca-green">
                  <Check className="size-[12px] text-white" />
                </span>
              ) : (
                <span
                  className={`flex size-[18px] items-center justify-center rounded-full border-2 ${
                    active ? "animate-spin border-gca-green border-t-transparent" : "border-gca-border"
                  }`}
                />
              )}
              <div>
                <p className={`text-[13px] font-medium ${done || active ? "text-gca-dark" : "text-gca-muted"}`}>{step.label}</p>
                {active && <p className="text-[12px] text-gca-show">In progress</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
