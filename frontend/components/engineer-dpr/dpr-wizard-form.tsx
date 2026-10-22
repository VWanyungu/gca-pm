"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { StepNavigator } from "./step-navigator";
import { WIZARD_STEPS, type DprDraftInput } from "./types";
import { SiteConditionsStep } from "./steps/site-conditions-step";
import { EffectsStep } from "./steps/effects-step";
import { WorkProgressStep } from "./steps/work-progress-step";
import { PersonnelStep } from "./steps/personnel-step";
import { EquipmentNotesStep } from "./steps/equipment-notes-step";
import { PhotosStep } from "./steps/photos-step";

const STEP_COMPONENTS = [
  SiteConditionsStep,
  EffectsStep,
  WorkProgressStep,
  PersonnelStep,
  EquipmentNotesStep,
  PhotosStep,
];

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
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;
  const isFinalAction = isFullLayout || isLastStep;
  const StepComponent = STEP_COMPONENTS[currentStep];

  const [activeSectionKey, setActiveSectionKey] = useState(WIZARD_STEPS[0].key);
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
    WIZARD_STEPS.forEach((step) => {
      const el = sectionRefs.current[step.key];
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [isFullLayout]);

  function scrollToSection(key: string) {
    setActiveSectionKey(key);
    sectionRefs.current[key]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between bg-white px-[16px] py-[10px]">
        <div className="flex items-center gap-[14px]">
          <button onClick={onClose} aria-label="Close">
            <span className="text-[18px] text-gca-dark">×</span>
          </button>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[17px] font-semibold text-gca-dark">{title}</p>
            <p className="text-[12px] text-gca-show">
              {dateLabel}
              {projectName ? ` · ${projectName}` : ""}
            </p>
          </div>
        </div>
        <p className="flex min-w-[96px] items-center justify-end text-[12px] text-gca-muted">
          {saving ? (
            <LoaderCircle className="size-[18px] animate-spin" aria-label="Saving" />
          ) : savedAt ? (
            `Saved ${formatSavedTime(savedAt)}`
          ) : (
            ""
          )}
        </p>
      </div>

      {isFullLayout ? (
        <div className="flex flex-1 items-start gap-[24px] p-[16px]">
          <div className="sticky top-[16px] flex w-[220px] shrink-0 flex-col gap-[2px] rounded-[12px] border border-gca-border bg-white px-[16px] py-[16px]">
            <p className="mb-[10px] text-[12px] font-semibold text-gca-muted">Sections</p>
            {WIZARD_STEPS.map((step) => (
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
            {WIZARD_STEPS.map((step, i) => {
              const SectionComponent = STEP_COMPONENTS[i];
              return (
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
                  {i === 0 ? (
                    <SiteConditionsStep
                      draft={draft}
                      update={update}
                      projectId={projectId}
                      siteLocationError={siteLocationError}
                    />
                  ) : (
                    <SectionComponent draft={draft} update={update} projectId={projectId} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <>
          <StepNavigator currentStep={currentStep} onStepClick={setCurrentStep} />

          <div className="flex flex-1 flex-col gap-[16px] overflow-y-auto p-[16px]">
            {currentStep === 0 ? (
              <SiteConditionsStep
                draft={draft}
                update={update}
                projectId={projectId}
                siteLocationError={siteLocationError}
              />
            ) : (
              <StepComponent draft={draft} update={update} projectId={projectId} />
            )}
          </div>
        </>
      )}

      {amendmentMode && (
        <div className="flex flex-col gap-[6px] border-t border-gca-border bg-white px-[16px] pt-[12px]">
          <label htmlFor="dpr-amendment-reason" className="text-[13px] font-medium text-gca-dark">
            Reason for amendment
          </label>
          <textarea
            id="dpr-amendment-reason"
            value={amendmentReason}
            onChange={(event) => setAmendmentReason(event.target.value)}
            maxLength={10000}
            rows={3}
            className="rounded-[8px] border border-gca-border px-[12px] py-[10px] text-[14px] outline-none focus:border-gca-green"
          />
        </div>
      )}

      <div className="sticky bottom-0 z-10 flex gap-[12px] border-t border-gca-border bg-white px-[16px] pt-[12px] pb-[30px]">
        {!amendmentMode && (
          <button
            onClick={onSaveDraft}
            disabled={saving}
            className="flex flex-1 items-center justify-center rounded-[8px] border border-gca-border bg-white py-[13px] disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="size-[18px] animate-spin" aria-label="Saving draft" />
            ) : (
              <p className="text-[15px] font-semibold text-gca-dark">Save draft</p>
            )}
          </button>
        )}
        <button
          onClick={onPrimary}
          disabled={submitting}
          className="flex flex-1 items-center justify-center rounded-[8px] bg-gca-green py-[13px] disabled:opacity-60"
        >
          <p className="text-[15px] font-semibold text-white">
            {isFinalAction && submitting ? (
              <LoaderCircle
                className="size-[18px] animate-spin"
                aria-label={amendmentMode ? "Requesting amendment" : "Submitting"}
              />
            ) : isFinalAction ? (
              amendmentMode ? "Request amendment" : "Submit"
            ) : (
              "Next"
            )}
          </p>
        </button>
      </div>
    </div>
  );
}

/** Advances to the next step (steps layout) or signals "this is the final action" (full
 *  layout, or already the last step) — shared logic the two owning wizards call into. */
export function isWizardFinalAction(layout: "steps" | "full", currentStep: number): boolean {
  return layout === "full" || currentStep === WIZARD_STEPS.length - 1;
}
