"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { usePdmStages } from "@/hooks/use-pdm-stages";

type Preset = "full" | "deliver" | "develop" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "full", label: "Full lifecycle" },
  { id: "deliver", label: "Deliver" },
  { id: "develop", label: "Develop" },
  { id: "custom", label: "Custom" },
];

interface ScopeStepProps {
  value: number[];
  onChange: (stages: number[]) => void;
  onBack: () => void;
  onNext: () => void;
  nextLabel: string;
}

export function ScopeStep({ value, onChange, onBack, onNext, nextLabel }: ScopeStepProps) {
  const { data: stages = [], isLoading } = usePdmStages();
  const [preset, setPreset] = useState<Preset>("deliver");

  function applyPreset(next: Preset) {
    setPreset(next);
    if (next === "custom") return;
    if (next === "full") return onChange(stages.map((s) => s.stage_no));
    onChange(stages.filter((s) => s.phase_code === next).map((s) => s.stage_no));
  }

  function toggleStage(stageNo: number) {
    setPreset("custom");
    onChange(value.includes(stageNo) ? value.filter((s) => s !== stageNo) : [...value, stageNo]);
  }

  const inScope = stages.filter((s) => value.includes(s.stage_no));
  const notInScope = stages.filter((s) => !value.includes(s.stage_no));

  return (
    <div className="flex w-[849px] flex-col gap-[32px]">
      <div>
        <h2 className="text-[22px] font-semibold tracking-[-0.4px] text-gca-dark">Choose the stages</h2>
        <p className="pt-[8px] text-[14px] text-gca-show">Start from a preset, then add or remove stages.</p>
      </div>

      <div className="flex items-center gap-[4px]">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => applyPreset(p.id)}
            className="flex items-center gap-[10px] rounded-[8px] px-[11px] py-[13px]"
          >
            <span
              className={`flex size-[18px] items-center justify-center rounded-full border-2 ${
                preset === p.id ? "border-gca-green" : "border-gca-border"
              }`}
            >
              {preset === p.id && <span className="size-[10px] rounded-full bg-gca-green" />}
            </span>
            <span className="text-[14px] font-medium text-gca-dark">{p.label}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="h-[100px] animate-pulse rounded-[8px] bg-gca-page-bg" />
      ) : (
        <>
          <div className="flex flex-col gap-[12px]">
            <p className="text-[14px] font-medium text-gca-dark">In scope</p>
            <div className="flex flex-wrap gap-[10px]">
              {inScope.map((s) => (
                <button
                  key={s.stage_no}
                  type="button"
                  onClick={() => toggleStage(s.stage_no)}
                  className="flex items-center gap-[8px] rounded-[8px] bg-gca-badge-bg px-[11px] py-[8px] text-[14px] font-medium text-gca-badge-text"
                >
                  {s.stage_no} · {s.name.split(" ")[0]}
                  <X className="size-[8px]" />
                </button>
              ))}
              {inScope.length === 0 && <p className="text-[13px] text-gca-muted">No stages selected yet.</p>}
            </div>
          </div>

          <div className="flex flex-col gap-[12px]">
            <p className="text-[14px] font-medium text-gca-dark">Add a stage</p>
            <div className="flex flex-wrap gap-[10px]">
              {notInScope.map((s) => (
                <button
                  key={s.stage_no}
                  type="button"
                  onClick={() => toggleStage(s.stage_no)}
                  className="flex items-center gap-[8px] rounded-[8px] border border-gca-border px-[11px] py-[8px] text-[14px] font-medium text-gca-dark hover:bg-gca-page-bg"
                >
                  <Plus className="size-[10px]" />
                  {s.stage_no} · {s.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-between pt-[10px]">
        <button type="button" onClick={onBack} className="text-[14px] font-medium text-gca-show">
          ← Back
        </button>
        <button
          type="button"
          disabled={value.length === 0}
          onClick={onNext}
          className="rounded-[8px] bg-gca-green px-[18px] py-[11px] text-[14px] font-semibold text-white hover:bg-gca-green-hover disabled:opacity-50"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}
