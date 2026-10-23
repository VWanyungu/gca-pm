"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { reportError } from "@/lib/toast";
import { useProjectDetail } from "@/components/project-overview/use-project-data";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_CREATE_DPR } from "@/lib/access-control";
import { useEditDprDraft } from "./use-dpr-draft";
import { getWizardSteps } from "./types";
import { submitDpr } from "./use-dpr-wizard-data";
import { useRequestDprAmendment } from "@/components/dpr/use-dpr-actions";
import { DprWizardForm } from "./dpr-wizard-form";

interface DprEditWizardProps {
  projectId: string;
  /** The DPR being edited — known up front (from the list row), never guessed from a date. */
  dprId: string;
  /** true for "Request amendment" on a submitted DPR; false for editing a draft outright. */
  amendmentMode?: boolean;
  onClose?: () => void;
  onSubmitted?: (dprId: string) => void;
  onAmendmentRequested?: () => void;
  layout?: "steps" | "full";
}

/** Editing one specific, already-submitted-or-drafted DPR — resumes straight from its own
 *  server data (see `useEditDprDraft`), never from a date lookup or a local cache. */
export function DprEditWizard({
  projectId,
  dprId,
  amendmentMode = false,
  onClose,
  onSubmitted,
  onAmendmentRequested,
  layout = "steps",
}: DprEditWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { data: projectDetail } = useProjectDetail(projectId);
  const project = projectDetail?.project;
  const { draft, update, reportDate, currentStep, setCurrentStep, save, saving, savedAt, loading } =
    useEditDprDraft(projectId, dprId);
  const [submitting, setSubmitting] = useState(false);
  const [amendmentReason, setAmendmentReason] = useState("");
  const [siteLocationError, setSiteLocationError] = useState(false);
  const requestAmendment = useRequestDprAmendment(projectId);
  const steps = getWizardSteps(amendmentMode);
  const totalSteps = steps.length;

  function updateDraft(patch: Partial<NonNullable<typeof draft>>) {
    if (patch.site_location?.trim()) setSiteLocationError(false);
    update(patch);
  }

  function getStepIndex(key: string) {
    const index = steps.findIndex((step) => step.key === key);
    if (index === -1) throw new Error(`Missing DPR wizard step: ${key}`);
    return index;
  }

  const canEditDpr = canAccess(user?.role, CAN_CREATE_DPR, { projectId });
  const canRequestAsPm = canAccess(user?.role, [{ role: "PM", scopeType: "project" }], { projectId });
  if (user && !(amendmentMode ? canEditDpr || canRequestAsPm : canEditDpr)) {
    return (
      <div className="flex flex-1 items-center justify-center p-[40px]">
        <p className="text-[14px] text-gca-muted">
          You don&apos;t have access to edit this DPR.
        </p>
      </div>
    );
  }

  function goToSiteConditions() {
    setSiteLocationError(true);
    setCurrentStep(getStepIndex("site-conditions"));
  }

  async function handleSaveDraft() {
    if (!draft || !draft.site_location.trim()) {
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
    if (!draft) return;
    const isFinal = layout === "full" || currentStep === totalSteps - 1;
    if (!isFinal) {
      if (!amendmentMode && draft.site_location.trim()) {
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

    if (amendmentMode && !amendmentReason.trim()) {
      reportError("Please explain why this DPR needs to be amended");
      setCurrentStep(getStepIndex("amendment-reason"));
      return;
    }

    setSubmitting(true);
    try {
      if (amendmentMode) {
        await requestAmendment.mutateAsync({ dprId, draft, reason: amendmentReason.trim() });
        onAmendmentRequested?.();
        return;
      }
      await save();
      const submitted = await submitDpr(projectId, dprId);
      if (onSubmitted) onSubmitted(submitted.dpr_id);
      else router.push(`/engineer/dpr/${submitted.dpr_id}/confirmation?projectId=${projectId}`);
    } catch (err) {
      reportError(err instanceof Error ? err.message : "Could not submit DPR");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || !draft) {
    return (
      <div className="flex flex-1 items-center justify-center p-[40px]">
        <LoaderCircle className="size-[24px] animate-spin text-gca-muted" />
      </div>
    );
  }

  return (
    <DprWizardForm
      title={amendmentMode ? "Request DPR amendment" : "Daily progress report"}
      dateLabel={
        reportDate
          ? new Date(`${reportDate}T00:00:00Z`).toLocaleDateString("en-GB", {
              weekday: "short",
              day: "numeric",
              month: "short",
              timeZone: "UTC",
            })
          : ""
      }
      projectName={project?.name}
      draft={draft}
      update={updateDraft}
      projectId={projectId}
      layout={layout}
      currentStep={currentStep}
      setCurrentStep={setCurrentStep}
      siteLocationError={siteLocationError}
      amendmentMode={amendmentMode}
      amendmentReason={amendmentReason}
      setAmendmentReason={setAmendmentReason}
      saving={saving}
      savedAt={savedAt}
      submitting={submitting || (amendmentMode && requestAmendment.isPending)}
      onClose={() => (onClose ? onClose() : router.push("/engineer"))}
      onSaveDraft={() => void handleSaveDraft()}
      onPrimary={() => void handlePrimary()}
    />
  );
}
