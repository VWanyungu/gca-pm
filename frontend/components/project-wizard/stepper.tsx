import { Check } from "lucide-react";

export interface WizardStep {
  key: string;
  label: string;
  description: string;
}

interface ProjectStepperProps {
  steps: WizardStep[];
  currentKey: string;
  /** "create" only lets you jump to steps you've already completed; "edit" lets you jump anywhere. */
  mode: "create" | "edit";
  completedKeys: string[];
  onStepClick: (key: string) => void;
}

export function ProjectStepper({ steps, currentKey, mode, completedKeys, onStepClick }: ProjectStepperProps) {
  const currentIndex = steps.findIndex((s) => s.key === currentKey);

  return (
    <div className="flex w-[400px] flex-col gap-[20px] rounded-[12px] border border-gca-border p-[32px]">
      {mode === "edit" && (
        <p className="text-[13px] text-gca-muted">Jump to any step to edit it.</p>
      )}
      <div className="flex flex-col">
        {steps.map((step, i) => {
          const isDone = completedKeys.includes(step.key);
          const isCurrent = step.key === currentKey;
          const clickable = mode === "edit" || isDone || i <= currentIndex;

          return (
            <button
              key={step.key}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onStepClick(step.key)}
              className="flex gap-[16px] text-left disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center">
                <span
                  className={`flex size-[32px] shrink-0 items-center justify-center rounded-full text-[14px] font-semibold ${
                    isCurrent
                      ? "bg-gca-green text-white"
                      : isDone
                        ? "bg-gca-badge-bg text-gca-green"
                        : "bg-gca-page-bg text-gca-muted"
                  }`}
                >
                  {isDone && !isCurrent ? <Check className="size-[14px]" /> : i + 1}
                </span>
                {i < steps.length - 1 && <span className="my-[6px] w-px flex-1 bg-gca-border" />}
              </div>
              <div className="flex flex-col gap-[2px] pb-[24px]">
                <span className={`text-[15px] font-semibold ${isCurrent ? "text-gca-dark" : "text-gca-show"}`}>
                  {step.label}
                </span>
                <span className="text-[13px] text-gca-muted">{step.description}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
