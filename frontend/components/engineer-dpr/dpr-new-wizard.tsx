"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LoaderCircle, ArrowLeft } from "lucide-react";
import { reportError } from "@/lib/toast";
import { useProjectDetail } from "@/components/project-overview/use-project-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_CREATE_DPR } from "@/lib/access-control";
import { useNewDprDraft } from "./use-dpr-draft";
import { todayInTimezone } from "./types";
import { submitDpr, useDprPrefill } from "./use-dpr-wizard-data";
import { DprWizardForm } from "./dpr-wizard-form";

interface DprNewWizardProps {
  projectId: string;
  reportDate?: string;
  /** Where "×" (close) goes. Defaults to the mobile engineer home. */
  onClose?: () => void;
  /** Where submitting lands. Defaults to the mobile confirmation screen. */
  onSubmitted?: (dprId: string) => void;
  layout?: "steps" | "full";
}

/** Starting a brand-new DPR: always begins from a blank form (plus the AC-DPR-12 prefill
 *  below) — see `useNewDprDraft` for why there's no localStorage involved. */
export function DprNewWizard({
  projectId,
  reportDate: requestedReportDate,
  onClose,
  onSubmitted,
  layout = "steps",
}: DprNewWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: projectDetail } = useProjectDetail(projectId);
  const project = projectDetail?.project;
  const reportDate = requestedReportDate ?? todayInTimezone(project?.timezone);
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
  } = useNewDprDraft(projectId, reportDate);
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

  function updateDraft(patch: Partial<typeof draft>) {
    if (patch.site_location?.trim()) setSiteLocationError(false);
    update(patch);
  }

  const canEditDpr = canAccess(user?.role, CAN_CREATE_DPR, { projectId });
  if (user && !canEditDpr) {
    return (
      <div className="flex flex-1 items-center justify-center p-[40px]">
        <p className="text-[14px] text-gca-muted">
          You don&apos;t have access to create a DPR for this project.
        </p>
      </div>
    );
  }

  function goToSiteConditions() {
    setSiteLocationError(true);
    setCurrentStep(0);
  }

  async function handleSaveDraft() {
    if (!draft.site_location.trim()) {
      goToSiteConditions();
      return;
    }
    try {
      await save();
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Could not save draft");
    }
  }

  async function handlePrimary() {
    const isFinal = layout === "full" || currentStep === 5;
    if (!isFinal) {
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
      goToSiteConditions();
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
      <div className="flex flex-col">
        <div className="flex flex-col gap-[8px]">
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex gap-[6px] items-center text-[14px] font-medium text-gca-green cursor-pointer"
          >
            <ArrowLeft className="size-[14px]" /> DPR table
          </button>
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-[12px] p-[40px] mt-[40px] text-center">
          <p className="text-[16px] font-semibold text-gca-dark">
            Today's DPR is already submitted
          </p>
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
            onClick={() =>
              dprId ? router.push(`/projects/${projectId}/dpr/${dprId}`) : onClose?.()
            }
            className="cursor-pointer rounded-[8px] bg-gca-green px-[16px] py-[10px] text-[14px] font-semibold text-white"
          >
            View it
          </button>
        </div>
      </div>
    );
  }

  return (
    <DprWizardForm
      title="Daily progress report"
      dateLabel={new Date(`${reportDate}T00:00:00Z`).toLocaleDateString("en-GB", {
        weekday: "short",
        day: "numeric",
        month: "short",
        timeZone: "UTC",
      })}
      projectName={project?.name}
      draft={draft}
      update={updateDraft}
      projectId={projectId}
      layout={layout}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      siteLocationError={siteLocationError}
      amendmentMode={false}
      amendmentReason=""
      setAmendmentReason={() => {}}
      saving={saving}
      savedAt={savedAt}
      submitting={submitting}
      onClose={() => (onClose ? onClose() : router.push("/engineer"))}
      onSaveDraft={() => void handleSaveDraft()}
      onPrimary={() => void handlePrimary()}
    />
  );
}
