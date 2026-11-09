"use client";

import { useMemo, useState } from "react";
import { PageSpinner } from "@/components/page-spinner";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { api } from "@/lib/api-client";
import {
  useProjectDetail,
  useProjectTeam,
  useStageActivities,
} from "@/components/project-overview/use-project-data";
import {
  useProjectStage,
  useStageChecklist,
  useStageViewInvalidate,
  useSyncGateActivities,
} from "./use-stage-view-data";
import { StageHeader } from "./stage-header";
import { ActivitiesTable } from "./activities-table";
import { AddActivityForm } from "./add-activity-form";
import { ActivityDetail } from "./activity-detail";
import { ChecklistCard } from "./checklist-card";
import { StageRisksCard } from "./stage-risks-card";
import type { StageActivity } from "@/components/project-overview/types";

type SubView =
  | { mode: "list" }
  | { mode: "add" }
  | { mode: "edit"; activityId: string }
  | { mode: "detail"; activityId: string };

export function StageView({ projectId, stageNo }: { projectId: string; stageNo: number }) {
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: stage, isLoading, error } = useProjectStage(projectId, stageNo);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: allActivities = [] } = useStageActivities(projectId);
  const { data: checklistItems = [] } = useStageChecklist(projectId, stageNo);
  const invalidate = useStageViewInvalidate(projectId, stageNo);
  const syncGateActivities = useSyncGateActivities(projectId, stageNo);
  const [subView, setSubView] = useState<SubView>({ mode: "list" });
  const [checklistRevealed, setChecklistRevealed] = useState(false);
  const [togglingComplete, setTogglingComplete] = useState(false);

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });

  const stageActivities = useMemo(
    () => allActivities.filter((a: StageActivity) => a.stage_no === stageNo),
    [allActivities, stageNo],
  );
  const doneCount = stageActivities.filter((a) => a.status === "done").length;
  const percentComplete =
    stageActivities.length === 0 ? 0 : Math.round((doneCount / stageActivities.length) * 100);

  async function toggleComplete() {
    if (!stage) return;
    setTogglingComplete(true);
    try {
      const toState = stage.state === "complete" ? "active" : "complete";
      await api.patch(`/projects/${projectId}/stages/${stageNo}`, { state: toState });
      invalidate();
    } finally {
      setTogglingComplete(false);
    }
  }

  if (isLoading) {
    return (
      <main className="flex w-full max-w-[1200px] flex-col p-[20px] md:p-[40px]">
        <PageSpinner className="min-h-[300px]" />
      </main>
    );
  }
  if (error || !stage || !project) return null;

  // Kickoff/Closure activities are predefined and self-contained — no risks card, and the
  // checklist is always active rather than something the PM opts into.
  const isGateStage = stage.kind !== "pdm";

  const editingActivity =
    subView.mode === "edit"
      ? allActivities.find((a) => a.activity_id === subView.activityId)
      : undefined;

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[24px] p-[20px] md:p-[40px]">
      <StageHeader
        stage={stage}
        stageNo={stageNo}
        percentComplete={percentComplete}
        doneCount={doneCount}
        totalCount={stageActivities.length}
        canManage={canManage}
        hasChecklist={isGateStage || checklistRevealed || checklistItems.length > 0}
        onAddChecklist={() => setChecklistRevealed(true)}
        onToggleComplete={toggleComplete}
        togglingComplete={togglingComplete}
        onSync={() => syncGateActivities.mutate()}
        syncing={syncGateActivities.isPending}
      />

      {(subView.mode === "list" || subView.mode === "detail") && (
        <div className="flex w-full flex-col gap-[20px] lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1">
            {subView.mode === "list" ? (
              <ActivitiesTable
                projectId={projectId}
                stageNo={stageNo}
                team={team}
                allowAdd={stage.kind === "pdm"}
                onAddActivity={() => setSubView({ mode: "add" })}
                onOpenActivity={(activityId) => setSubView({ mode: "detail", activityId })}
              />
            ) : (
              <ActivityDetail
                projectId={projectId}
                stageNo={stageNo}
                activityId={subView.activityId}
                team={team}
                canManage={canManage}
                onBack={() => setSubView({ mode: "list" })}
                onEdit={() => setSubView({ mode: "edit", activityId: subView.activityId })}
              />
            )}
          </div>
          <div className="flex w-full shrink-0 flex-col gap-[20px] lg:w-[362px]">
            <ChecklistCard
              projectId={projectId}
              stageNo={stageNo}
              canManage={canManage}
              revealed={isGateStage || checklistRevealed}
              onRemoved={() => setChecklistRevealed(false)}
            />
            {!isGateStage && <StageRisksCard projectId={projectId} stageNo={stageNo} />}
          </div>
        </div>
      )}

      {subView.mode === "add" && (
        <AddActivityForm
          projectId={projectId}
          stageNo={stageNo}
          stageName={stage.stage_name}
          team={team}
          onDone={() => setSubView({ mode: "list" })}
          onCancel={() => setSubView({ mode: "list" })}
        />
      )}

      {subView.mode === "edit" && editingActivity && (
        <AddActivityForm
          projectId={projectId}
          stageNo={stageNo}
          stageName={stage.stage_name}
          team={team}
          editing={editingActivity}
          onDone={() => setSubView({ mode: "detail", activityId: editingActivity.activity_id })}
          onCancel={() => setSubView({ mode: "detail", activityId: editingActivity.activity_id })}
        />
      )}
    </main>
  );
}
