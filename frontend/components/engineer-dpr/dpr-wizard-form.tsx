"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CloudAlert,
  CloudCheck,
  CloudSync,
  CloudUpload,
  LoaderCircle,
} from "lucide-react";
import { SectionChips } from "@/components/ui/section-chips";
import { StepNavigator } from "./step-navigator";
import {
  getDprValidationErrors,
  getWizardSteps,
  type DprDraftInput,
  type WizardStepDef,
} from "./types";
import { SiteConditionsStep } from "./steps/site-conditions-step";
import { EffectsStep } from "./steps/effects-step";
import { WorkProgressStep } from "./steps/work-progress-step";
import { PersonnelStep } from "./steps/personnel-step";
import { EquipmentNotesStep } from "./steps/equipment-notes-step";
import { PhotosStep } from "./steps/photos-step";

function formatSavedTime(d: Date | null) {
  if (!d) return null;
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

interface DprWizardFormProps {
  title: string;
  dateLabel: string;
  projectName?: string;
  draft: DprDraftInput;
  update: (patch: Partial<DprDraftInput>) => void;
  projectId: string;
  /** "steps": one step at a time, for the mobile flow. "full": every section on one
   *  scrollable page with a sidebar table of contents, like the DPR viewer — the desktop
   *  inline wizard has the width for it. */
  layout: "steps" | "full";
  currentStep: number;
  setCurrentStep: (step: number) => void;
  siteLocationError: boolean;
  amendmentMode: boolean;
  amendmentReason: string;
  setAmendmentReason: (reason: string) => void;
  saving: boolean;
  savedAt: Date | null;
  submitting: boolean;
  onClose?: () => void;
  onSaveDraft: () => void;
  onPrimary: () => void;
}

/** The step/section form shared by the new-DPR and edit-DPR wizards — everything below the
 *  owning component's own loading/access checks, which differ between the two. */
export function DprWizardForm({
  title,
  dateLabel,
  projectName,
  draft,
  update,
  projectId,
  layout,
  currentStep,
  setCurrentStep,
  siteLocationError,
  amendmentMode,
  amendmentReason,
  setAmendmentReason,
  saving,
  savedAt,
  submitting,
  onClose,
  onSaveDraft,
  onPrimary,
}: DprWizardFormProps) {
  const isFullLayout = layout === "full";
  const steps = getWizardSteps(amendmentMode);
  const isLastStep = currentStep === steps.length - 1;
  const isFinalAction = isFullLayout || isLastStep;
  const validationErrors = getDprValidationErrors(draft);

  const [activeSectionKey, setActiveSectionKey] = useState(steps[0].key);
  const sectionRefs = useRef<Partial<Record<string, HTMLDivElement | null>>>({});

  useEffect(() => {
    if (!isFullLayout) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActiveSectionKey(visible.target.id.replace("wizard-section-", ""));
      },
      { rootMargin: "-80px 0px -70% 0px" },
    );
    steps.forEach((step) => {
      const el = sectionRefs.current[step.key];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullLayout, amendmentMode]);

  function scrollToSection(key: string) {
    setActiveSectionKey(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function renderStepBody(step: WizardStepDef) {
    if (step.key === "amendment-reason") {
      return (
        <div className="flex flex-col gap-[6px]">
          <textarea
            id="dpr-amendment-reason"
            value={amendmentReason}
            onChange={(event) => setAmendmentReason(event.target.value)}
            maxLength={10000}
            rows={5}
            placeholder="Explain why this DPR needs to be amended"
            className="w-full rounded-[8px] border border-gca-border bg-gca-surface p-[12px] text-[15px] text-gca-dark outline-none focus:border-gca-green placeholder:text-gca-muted"
          />
        </div>
      );
    }
    if (step.key === "site-conditions") {
      return (
        <SiteConditionsStep
          draft={draft}
          update={update}
          projectId={projectId}
          siteLocationError={siteLocationError}
        />
      );
    }
    if (step.key === "work-progress") {
      return (
        <WorkProgressStep
          draft={draft}
          update={update}
          projectId={projectId}
          errors={validationErrors.workItems}
          activityErrors={validationErrors.activityProgress}
        />
      );
    }
    if (step.key === "personnel") {
      return (
        <PersonnelStep
          draft={draft}
          update={update}
          projectId={projectId}
          errors={validationErrors.personnelGroups}
        />
      );
    }
    if (step.key === "effects") {
      return <EffectsStep draft={draft} update={update} projectId={projectId} />;
    }
    if (step.key === "equipment-notes") {
      return <EquipmentNotesStep draft={draft} update={update} projectId={projectId} />;
    }
    if (step.key === "photos") {
      return <PhotosStep draft={draft} update={update} projectId={projectId} />;
    }
    throw new Error(`Unsupported DPR wizard step: ${step.key}`);
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-[8px]">
        <button
          onClick={onClose}
          aria-label="Close"
          className="flex gap-[6px] items-center text-[14px] font-medium text-gca-green cursor-pointer"
        >
          <ArrowLeft className="size-[14px]" /> DPR table
        </button>
      </div>

      <div className="flex items-center justify-between gap-[12px] bg-gca-surface py-[10px]">
        <div className="flex min-w-0 items-start gap-[14px]">
          <div className="flex min-w-0 flex-col gap-[2px]">
            <h1 className="text-2xl font-semibold tracking-[-0.7px] text-gca-dark sm:text-[28px] flex items-center gap-[10px]">
              {title}{" "}
              {saving ? (
                // <LoaderCircle className="size-[18px] animate-spin" aria-label="Saving" />
                <CloudSync size={24} aria-label="Saving" />
              ) : savedAt ? (
                // `Saved ${formatSavedTime(savedAt)}`
                <CloudCheck size={24} className="text-gca-green font-bold" />
              ) : amendmentMode ? (
                <></>
              ) : (
                <CloudAlert size={24} className="text-gca-warning" />
              )}
            </h1>
            <p className="text-[12px] text-gca-show">
              {dateLabel}
              {projectName ? ` · ${projectName}` : ""}
            </p>
          </div>
        </div>
        {/* <p className="flex min-w-[96px] items-center justify-end text-[12px] text-gca-muted">
          {saving ? (
            // <LoaderCircle className="size-[18px] animate-spin" aria-label="Saving" />
            <CloudSync size={24} aria-label="Saving" className="font-bold" />
          ) : savedAt ? (
            // `Saved ${formatSavedTime(savedAt)}`
            <CloudCheck size={24} className="text-gca-green font-bold" />
          ) : (
            <CloudAlert size={24} className="text-gca-warning font-bold" />
          )}
        </p> */}
        {/* The step flow carries this in a sticky footer instead, where a thumb reaches it
            on any step however long. */}
        {isFullLayout && (
          <button
            onClick={onPrimary}
            disabled={submitting}
            className="shrink-0 cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-gca-on-accent hover:bg-gca-green-hover disabled:opacity-50"
          >
            {isFinalAction && submitting ? (
              <LoaderCircle
                className="size-[18px] animate-spin"
                aria-label={amendmentMode ? "Requesting amendment" : "Submitting"}
              />
            ) : isFinalAction ? (
              amendmentMode ? (
                "Request amendment"
              ) : (
                "Submit"
              )
            ) : (
              "Next"
            )}
          </button>
        )}
      </div>

      {isFullLayout ? (
        <div className="flex flex-1 flex-col items-stretch gap-[16px] py-[16px] lg:flex-row lg:items-start lg:gap-[24px]">
          <SectionChips
            sections={steps.map((step) => ({ id: step.key, label: step.label }))}
            activeId={activeSectionKey}
            onSelect={scrollToSection}
          />

          <div className="sticky top-[80px] hidden w-[220px] shrink-0 flex-col gap-[2px] rounded-[12px] bg-gca-surface lg:flex">
            <p className="mb-[10px] text-[12px] font-semibold text-gca-muted">Sections</p>
            {steps.map((step) => (
              <button
                key={step.key}
                type="button"
                onClick={() => scrollToSection(step.key)}
                className={`cursor-pointer rounded-[6px] px-[10px] py-[7px] text-left text-[13px] ${
                  activeSectionKey === step.key
                    ? "bg-gca-badge-bg font-semibold text-gca-green"
                    : "font-normal text-gca-show hover:bg-gca-page-bg"
                }`}
              >
                {step.label}
              </button>
            ))}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-[40px] pb-[24px]">
            {steps.map((step, i) => (
              <div
                key={step.key}
                id={`wizard-section-${step.key}`}
                ref={(el) => {
                  sectionRefs.current[step.key] = el;
                }}
                className="flex flex-col gap-[16px] scroll-mt-[16px]"
              >
                <p className="text-[18px] font-semibold tracking-[-0.27px] text-gca-dark">
                  {step.label}
                </p>
                {renderStepBody(step)}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <StepNavigator steps={steps} currentStep={currentStep} onStepClick={setCurrentStep} />

          <div className="flex flex-1 flex-col gap-[16px] overflow-y-auto p-[16px]">
            {renderStepBody(steps[currentStep])}
          </div>

          <div className="sticky bottom-0 z-10 flex gap-[12px] border-t border-gca-border bg-gca-surface px-[16px] pb-[20px] pt-[12px]">
            {!amendmentMode && (
              <button
                onClick={onSaveDraft}
                disabled={saving}
                className="flex flex-1 cursor-pointer items-center justify-center rounded-[8px] border border-gca-border bg-gca-surface py-[13px] text-[15px] font-semibold text-gca-dark disabled:opacity-60"
              >
                {saving ? (
                  <LoaderCircle className="size-[18px] animate-spin" aria-label="Saving draft" />
                ) : (
                  "Save draft"
                )}
              </button>
            )}
            <button
              onClick={onPrimary}
              disabled={submitting}
              className="flex flex-1 cursor-pointer items-center justify-center rounded-[8px] bg-gca-green py-[13px] text-[15px] font-semibold text-gca-on-accent disabled:opacity-60"
            >
              {isFinalAction && submitting ? (
                <LoaderCircle
                  className="size-[18px] animate-spin"
                  aria-label={amendmentMode ? "Requesting amendment" : "Submitting"}
                />
              ) : isFinalAction ? (
                amendmentMode ? (
                  "Request amendment"
                ) : (
                  "Submit"
                )
              ) : (
                "Next"
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** Advances to the next step (steps layout) or signals "this is the final action" (full
 *  layout, or already the last step) — shared logic the two owning wizards call into. */
export function isWizardFinalAction(
  layout: "steps" | "full",
  currentStep: number,
  amendmentMode: boolean,
): boolean {
  return layout === "full" || currentStep === getWizardSteps(amendmentMode).length - 1;
}
