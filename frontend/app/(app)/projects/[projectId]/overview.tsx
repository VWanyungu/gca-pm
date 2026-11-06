"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { SystemStateScreen } from "@/components/system-state/system-state-screen";
import { useProjectSidebarData } from "@/components/project-overview/project-sidebar-context";
import { ProjectHero } from "@/components/project-overview/project-hero";
import { StagePipeline } from "@/components/project-overview/stage-pipeline";
import { ProgressCard } from "@/components/project-overview/progress-card";
import { NeedsAttentionCard } from "@/components/project-overview/needs-attention-card";
import { NextMilestonesRow } from "@/components/project-overview/next-milestones-row";
import { ProgressPhotosSection } from "@/components/project-overview/progress-photos-section";
import { TeamSection } from "@/components/project-overview/team-section";
import {
  useProjectDetail,
  useProjectDetailInvalidate,
  useProjectTeam,
  useClientContacts,
  useStageActivities,
  useMilestones,
  useProjectDprPhotos,
  // useOpenEscalations, // paused: no escalations module yet
  useDraftSubmission,
  ApiError,
} from "@/components/project-overview/use-project-data";

export default function ProjectOverview({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data, isLoading, error } = useProjectDetail(projectId);
  const invalidate = useProjectDetailInvalidate(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: clientContacts = [] } = useClientContacts(projectId);
  const { data: activities = [] } = useStageActivities(projectId);
  const { data: milestones = [] } = useMilestones(projectId, {
    aggregate: true,
  });
  // const { data: escalations = [] } = useOpenEscalations(projectId);
  const { data: draftSubmission } = useDraftSubmission(projectId);
  const { percentByStage } = useProjectSidebarData();

  const currentStage = useMemo(() => {
    // AC-STG-10: the highest-numbered active regular PDM stage (Kickoff/Closure are gate
    // stages, not part of this progression, and Closure is active for most of the project's
    // life, so both are excluded here); if every in-scope stage is complete, fall back to the
    // last one completed rather than showing nothing.
    const stages = (data?.stages ?? []).filter((s) => s.kind === "pdm");
    return (
      [...stages].reverse().find((s) => s.state === "active") ??
      [...stages].reverse().find((s) => s.state === "complete")
    );
  }, [data?.stages]);

  // DPR progress photos are only fetched and displayed if the current stage
  // is construction, commissioning, or decommissioning
  const isPhotoEligibleStage = useMemo(() => {
    if (!currentStage) return false;
    const name = currentStage.stage_name.toLowerCase();
    return (
      name.includes("construction") ||
      name.includes("commissioning") ||
      name.includes("decommissioning") ||
      [7, 8, 10].includes(currentStage.stage_no)
    );
  }, [currentStage]);

  const { data: dprPhotosData } = useProjectDprPhotos(projectId, isPhotoEligibleStage);

  const overdueActivities = useMemo(() => {
    const today = new Date();
    return activities.filter(
      (a) => a.status === "open" && a.due_date && new Date(a.due_date) < today,
    );
  }, [activities]);

  if (isLoading) {
    return <p className="p-[40px] text-[14px] text-gca-muted">Loading project…</p>;
  }
  if (error || !data) {
    if (error instanceof ApiError && error.httpStatus === 403) {
      return <SystemStateScreen code="403" />;
    }
    if (error instanceof ApiError && error.httpStatus === 404) {
      return <SystemStateScreen code="404" />;
    }
    return null;
  }

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[28px] p-[20px] md:p-[40px]">
      <ProjectHero
        project={data.project}
        stages={data.stages}
        milestones={milestones}
        canManage={canManage}
        onStatusChanged={invalidate}
      />

      <StagePipeline
        projectId={projectId}
        stages={data.stages}
        currentStage={currentStage}
        percentByStage={percentByStage}
        canManage={canManage}
        onChanged={invalidate}
      />

      {/* The progress chart needs ~700px to read at all, so it sits above the
          attention list rather than beside it until there is room for both. */}
      <div className="flex w-full flex-col items-stretch gap-[20px] xl:flex-row xl:items-start">
        <ProgressCard metrics={data.metrics} />
        <NeedsAttentionCard
          projectId={projectId}
          overdueActivities={overdueActivities}
          draftWeekStart={draftSubmission?.week_start ?? null}
          // escalations={escalations}
        />
      </div>

      <NextMilestonesRow projectId={projectId} milestones={milestones} />

      {isPhotoEligibleStage && (
        <ProgressPhotosSection
          projectId={projectId}
          photos={dprPhotosData?.photos ?? []}
          totalCount={dprPhotosData?.total ?? 0}
        />
      )}

      <TeamSection projectId={projectId} team={team} clientContacts={clientContacts} />
    </main>
  );
}
