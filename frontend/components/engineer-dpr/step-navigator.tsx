"use client";

import { WIZARD_STEPS } from "./types";

interface StepNavigatorProps {
  currentStep: number;
  onStepClick: (index: number) => void;
}

/** Every bar is clickable and jumps straight to that step — no completion gating. */
export function StepNavigator({ currentStep, onStepClick }: StepNavigatorProps) {
  return (
    <div className="flex flex-col gap-[8px] border-t border-gca-border bg-white px-[16px] py-[12px]">
      <div className="flex gap-[4px]">
        {WIZARD_STEPS.map((step, i) => (
          <button
            key={step.key}
            type="button"
            aria-label={`Go to step ${i + 1}: ${step.label}`}
            onClick={() => onStepClick(i)}
            className="h-[4px] flex-1 rounded-[2px]"
            style={{ background: i <= currentStep ? "#1f5530" : "#e2e8e3" }}
          />
        ))}
      </div>
      <p className="text-[12px] font-medium text-gca-show">
        {currentStep + 1} of {WIZARD_STEPS.length} · {WIZARD_STEPS[currentStep].label}
      </p>
    </div>
  );
}
