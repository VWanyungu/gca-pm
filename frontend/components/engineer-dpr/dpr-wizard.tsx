"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { reportError } from "@/lib/toast";
import { useProjectDetail } from "@/components/project-overview/use-project-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_CREATE_DPR } from "@/lib/access-control";
import { useDprDraft } from "./use-dpr-draft";
import { StepNavigator } from "./step-navigator";
import { WIZARD_STEPS } from "./types";
import { submitDpr, useDprPrefill, useWeatherCategories } from "./use-dpr-wizard-data";
import { compassDirection, useCurrentWeather, weatherCategoryName } from "./use-weather-autofill";
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

interface DprWizardProps {
  projectId: string;
  /** Where "×" (close) goes. Defaults to the mobile engineer home. */
  onClose?: () => void;
  /** Where submitting lands. Defaults to the mobile confirmation screen. */
  onSubmitted?: (dprId: string) => void;
}

export function DprWizard({ projectId, onClose, onSubmitted }: DprWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: projectDetail } = useProjectDetail(projectId);
  const project = projectDetail?.project;
  const reportDate = new Date().toISOString().slice(0, 10);
  const {
    draft,
    update,
    dprId,
    currentStep,
    setCurrentStep,
    save,
    saving,
    savedAt,
    checkingExisting,
    alreadySubmitted,
  } = useDprDraft(projectId, reportDate);
  const [submitting, setSubmitting] = useState(false);
  const [siteLocationError, setSiteLocationError] = useState(false);
  const { data: prefill } = useDprPrefill(projectId);

  // AC-DPR-12: a brand-new draft pre-fills the previous submitted DPR's site location,
  // contract no and contractor list (not their headcounts). Only applies once, and only
  // before the engineer has started typing, so it never overwrites in-progress edits.
  const appliedPrefill = useRef(false);
  useEffect(() => {
    if (appliedPrefill.current || !prefill || dprId || draft.site_location) return;
    appliedPrefill.current = true;
    update({
      site_location: prefill.site_location,
      contract_no: prefill.contract_no,
      personnel_groups: prefill.personnel_groups.map((g) => ({
        project_contractor_id: g.project_contractor_id,
        contractor_name: g.contractor_name,
        total_headcount: 0,
        role_counts: [],
      })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefill, dprId, draft.site_location]);

  // Prefills weather from the project's site coordinates (a free API, no key needed) — once,
  // and only while the engineer hasn't touched any weather field yet.
  const { data: weather } = useCurrentWeather(project?.site_lat ?? null, project?.site_lng ?? null);
  const { data: weatherCategories } = useWeatherCategories();
  const appliedWeather = useRef(false);
  useEffect(() => {
    // Wait for the resume-check (above) to settle first, so a resumed draft's own saved
    // weather always wins the race instead of being overwritten the instant it arrives.
    if (appliedWeather.current || checkingExisting || !weather || !weatherCategories?.length) return;
    const alreadySet =
      draft.weather_category_id !== null ||
      draft.temp_min_c !== null ||
      draft.temp_max_c !== null ||
      draft.humidity_pct !== null ||
      draft.wind !== null;
    if (alreadySet) {
      appliedWeather.current = true;
      return;
    }
    appliedWeather.current = true;
    const categoryName = weatherCategoryName(weather.weather_code, weather.temp_max_c, weather.wind_kph);
    const category = weatherCategories.find((c) => c.name === categoryName);
    update({
      weather_category_id: category?.weather_category_id ?? null,
      temp_min_c: Math.round(weather.temp_min_c),
      temp_max_c: Math.round(weather.temp_max_c),
      humidity_pct: Math.round(weather.humidity_pct),
      wind: `${Math.round(weather.wind_kph)} km/h ${compassDirection(weather.wind_direction_deg)}`,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weather, weatherCategories, checkingExisting]);

  const StepComponent = STEP_COMPONENTS[currentStep];
  const isLastStep = currentStep === WIZARD_STEPS.length - 1;

  function updateDraft(patch: Partial<typeof draft>) {
    if (patch.site_location?.trim()) setSiteLocationError(false);
    update(patch);
  }

  if (user && !canAccess(user.role, CAN_CREATE_DPR, { projectId })) {
    return (
      <div className="flex flex-1 items-center justify-center p-[40px]">
        <p className="text-[14px] text-gca-muted">
          You don&apos;t have access to create a DPR for this project.
        </p>
      </div>
    );
  }

  async function handleSaveDraft() {
    if (!draft.site_location.trim()) {
      setSiteLocationError(true);
      setCurrentStep(0);
      return;
    }
    try {
      await save();
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Could not save draft");
    }
  }

  async function handlePrimary() {
    if (!isLastStep) {
      if (draft.site_location.trim()) {
        try {
          await save();
        } catch (err) {
          reportError(err instanceof Error ? err.message : "Could not save draft");
        }
      }
      setCurrentStep(currentStep + 1);
      return;
    }

    if (!draft.site_location.trim()) {
      setSiteLocationError(true);
      setCurrentStep(0);
      return;
    }

    setSubmitting(true);
    try {
      await save();
      const id = dprId;
      if (!id) throw new Error("DPR draft was not saved — please try again");
      const submitted = await submitDpr(projectId, id);
      if (onSubmitted) onSubmitted(submitted.dpr_id);
      else router.push(`/engineer/dpr/${submitted.dpr_id}/confirmation?projectId=${projectId}`);
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Could not submit DPR");
    } finally {
      setSubmitting(false);
    }
  }

  // AC-DPR-04: this date already has a DPR and it's submitted — resuming it as an editable
  // draft here would either silently discard the real one or fail at the last step trying to
  // submit twice, so stop before either.
  if (checkingExisting) {
    return (
      <div className="flex flex-1 items-center justify-center p-[40px]">
        <LoaderCircle className="size-[24px] animate-spin text-gca-muted" />
      </div>
    );
  }

  if (alreadySubmitted) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-[12px] p-[40px] text-center">
        <p className="text-[16px] font-semibold text-gca-dark">Today's DPR is already submitted</p>
        <p className="text-[14px] text-gca-show">
          {project ? project.name : "This project"} already has a submitted DPR for{" "}
          {new Date(`${reportDate}T00:00:00Z`).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
          })}
          .
        </p>
        <button
          type="button"
          onClick={() => (dprId ? router.push(`/projects/${projectId}/dpr/${dprId}`) : onClose?.())}
          className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white"
        >
          View it
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between bg-white px-[16px] py-[10px]">
        <div className="flex items-center gap-[14px]">
          <button onClick={() => (onClose ? onClose() : router.push("/engineer"))} aria-label="Close">
            <span className="text-[18px] text-gca-dark">×</span>
          </button>
          <div className="flex flex-col gap-[2px]">
            <p className="text-[17px] font-semibold text-gca-dark">Daily progress report</p>
            <p className="text-[12px] text-gca-show">
              {new Date(`${reportDate}T00:00:00Z`).toLocaleDateString("en-GB", {
                weekday: "short",
                day: "numeric",
                month: "short",
                timeZone: "UTC",
              })}
              {project ? ` · ${project.name}` : ""}
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

      <StepNavigator currentStep={currentStep} onStepClick={setCurrentStep} />

      <div className="flex flex-1 flex-col gap-[16px] overflow-y-auto p-[16px]">
        {currentStep === 0 ? (
          <SiteConditionsStep
            draft={draft}
            update={updateDraft}
            projectId={projectId}
            siteLocationError={siteLocationError}
          />
        ) : (
          <StepComponent draft={draft} update={updateDraft} projectId={projectId} />
        )}
      </div>

      <div className="flex gap-[12px] border-t border-gca-border bg-white px-[16px] pt-[12px] pb-[30px]">
        <button
          onClick={handleSaveDraft}
          disabled={saving}
          className="flex flex-1 items-center justify-center rounded-[8px] border border-gca-border bg-white py-[13px] disabled:opacity-60"
        >
          {saving ? (
            <LoaderCircle className="size-[18px] animate-spin" aria-label="Saving draft" />
          ) : (
            <p className="text-[15px] font-semibold text-gca-dark">Save draft</p>
          )}
        </button>
        <button
          onClick={handlePrimary}
          disabled={submitting}
          className="flex flex-1 items-center justify-center rounded-[8px] bg-gca-green py-[13px] disabled:opacity-60"
        >
          <p className="text-[15px] font-semibold text-white">
            {isLastStep && submitting ? (
              <LoaderCircle className="size-[18px] animate-spin" aria-label="Submitting" />
            ) : isLastStep ? (
              "Submit"
            ) : (
              "Next"
            )}
          </p>
        </button>
      </div>
    </div>
  );
}
