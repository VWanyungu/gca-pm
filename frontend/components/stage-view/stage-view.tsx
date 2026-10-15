"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { api } from "@/lib/api-client";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import {
  useProjectDetail,
  useProjectTeam,
  useStageActivities,
} from "@/components/project-overview/use-project-data";
import { useProjectStage, useStageChecklist, useStageViewInvalidate } from "./use-stage-view-data";
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
  const [subView, setSubView] = useState<SubView>({ mode: "list" });
  const [checklistRevealed, setChecklistRevealed] = useState(false);

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });

  const percentComplete = useMemo(() => {
    const stageActivities = allActivities.filter((a: StageActivity) => a.stage_no === stageNo);
    if (stageActivities.length === 0) return 0;
    const done = stageActivities.filter((a) => a.status === "done").length;
    return Math.round((done / stageActivities.length) * 100);
  }, [allActivities, stageNo]);

  async function toggleComplete() {
    if (!stage) return;
    const toState = stage.state === "complete" ? "active" : "complete";
    await api.patch(`/projects/${projectId}/stages/${stageNo}`, { state: toState });
    invalidate();
  }

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center text-[14px] text-gca-muted">
        Loading stage…
      </div>
    );
  }
  if (error || !stage || !project) {
    return (
      <p className="p-[40px] text-[14px] text-error-text">{error?.message ?? "Stage not found"}</p>
    );
  }

  const editingActivity =
    subView.mode === "edit"
      ? allActivities.find((a) => a.activity_id === subView.activityId)
      : undefined;

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar
        projectId={projectId}
        stages={project.stages}
        active="stages"
        activeStageNo={stageNo}
      />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[24px] p-[40px]">
          <StageHeader
            stage={stage}
            stageNo={stageNo}
            percentComplete={percentComplete}
            canManage={canManage}
            hasChecklist={checklistItems.length > 0}
            onAddChecklist={() => setChecklistRevealed(true)}
            onToggleComplete={toggleComplete}
          />

          {(subView.mode === "list" || subView.mode === "detail") && (
            <div className="flex w-full items-start gap-[20px]">
              <div className="min-w-0 flex-1">
                {subView.mode === "list" ? (
                  <ActivitiesTable
                    projectId={projectId}
                    stageNo={stageNo}
                    team={team}
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
              <div className="flex w-[362px] shrink-0 flex-col gap-[20px]">
                <ChecklistCard
                  projectId={projectId}
                  stageNo={stageNo}
                  canManage={canManage}
                  revealed={checklistRevealed}
                  onRemoved={() => setChecklistRevealed(false)}
                />
                <StageRisksCard projectId={projectId} stageNo={stageNo} />
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
              onCancel={() =>
                setSubView({ mode: "detail", activityId: editingActivity.activity_id })
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}
