"use client";

import {
  EFFECTS_SEVERITY_LABEL,
  type DprEffectsSeverity,
} from "@/components/weekly-submission/types";
import type { DprDraftInput } from "../types";

interface StepProps {
  draft: DprDraftInput;
  update: (patch: Partial<DprDraftInput>) => void;
  projectId: string;
}

const SEVERITY_OPTIONS = Object.keys(EFFECTS_SEVERITY_LABEL) as DprEffectsSeverity[];

export function EffectsStep({ draft, update }: StepProps) {
  return (
    <div className="flex flex-col gap-[16px]">
      <div className="flex flex-col gap-[6px]">
        <label className="text-[13px] font-medium text-gca-dark">
          Effects on today&apos;s work
        </label>
        <div className="flex flex-wrap gap-[2px] rounded-[8px] bg-gca-page-bg p-[3px]">
          {SEVERITY_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() =>
                update(
                  option === "none"
                    ? { effects_severity: option, effects_text: null }
                    : { effects_severity: option },
                )
              }
              className={`flex-1 cursor-pointer rounded-[6px] px-[14px] py-[7px] text-[14px] whitespace-nowrap ${
                draft.effects_severity === option
                  ? "bg-gca-surface font-medium text-gca-dark shadow-[0px_1px_24px_0px_rgba(23,48,31,0.08)]"
                  : "font-normal text-gca-show"
              }`}
            >
              {EFFECTS_SEVERITY_LABEL[option]}
            </button>
          ))}
        </div>
      </div>

      {/* Nothing to describe when the day had no effect, and a stale description left behind
          by a change of mind would contradict the severity. */}
      {draft.effects_severity !== "none" && (
        <div className="flex flex-col gap-[6px]">
          <label className="text-[13px] font-medium text-gca-dark">Details</label>
          <textarea
            value={draft.effects_text ?? ""}
            onChange={(e) => update({ effects_text: e.target.value || null })}
            placeholder="Describe any effects on today's work"
            rows={4}
            className="w-full rounded-[8px] border border-gca-border bg-gca-surface p-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted"
          />
        </div>
      )}
    </div>
  );
}
