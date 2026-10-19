"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { SystemStateScreen } from "@/components/system-state/system-state-screen";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import { StatusControl } from "@/components/project-overview/status-control";
import { StagePipeline } from "@/components/project-overview/stage-pipeline";
import { ProgressCard } from "@/components/project-overview/progress-card";
import { NeedsAttentionCard } from "@/components/project-overview/needs-attention-card";
import { NextMilestonesRow } from "@/components/project-overview/next-milestones-row";
import { TeamSection } from "@/components/project-overview/team-section";
import {
  useProjectDetail,
  useProjectDetailInvalidate,
  useProjectTeam,
  useClientContacts,
  useStageActivities,
  useMilestones,
  useOpenEscalations,
  useDraftSubmission,
  useSidebarCounts,
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
  const { data: escalations = [] } = useOpenEscalations(projectId);
  const { data: draftSubmission } = useDraftSubmission(projectId);
  const { data: counts } = useSidebarCounts(projectId);

  const percentByStage = useMemo(() => {
    const result: Record<number, number> = {};
    for (const stage of data?.stages ?? []) {
      const stageActivities = activities.filter((a) => a.stage_no === stage.stage_no);
      if (stageActivities.length > 0) {
        const done = stageActivities.filter((a) => a.status === "done").length;
        result[stage.stage_no] = Math.round((done / stageActivities.length) * 100);
      }
    }
    return result;
  }, [data?.stages, activities]);

  const currentStage = useMemo(() => {
    const stages = data?.stages ?? [];
    // AC-STG-10: the highest-numbered active stage; if every in-scope stage is complete,
    // fall back to the last one completed rather than showing nothing.
    return (
      [...stages].reverse().find((s) => s.state === "active") ??
      [...stages].reverse().find((s) => s.state === "complete")
    );
  }, [data?.stages]);

  const overdueActivities = useMemo(() => {
    const today = new Date();
    return activities.filter(
      (a) => a.status === "open" && a.due_date && new Date(a.due_date) < today,
    );
  }, [activities]);

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center text-[14px] text-gca-muted">
        Loading project…
      </div>
    );
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

  const today = new Date();

  const weekNumber = Math.ceil(
    (today.getTime() - new Date(data.project.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar
        projectId={projectId}
        stages={data.stages}
        counts={counts}
        percentByStage={percentByStage}
        active="overview"
      />

      <div className=" w-full flex justify-center">
        <main className="flex w-full flex-col gap-[28px] p-[40px] max-w-[1200px]">
          <header className="flex w-full items-center justify-between">
            <div className="flex flex-col gap-[8px]">
              <h1 className="text-[30px] font-semibold tracking-[-0.75px] text-gca-dark">
                {data.project.name}
              </h1>
              <p className="text-[14px] text-gca-show">
                {data.project.client_name ?? "—"} · Week {weekNumber}
              </p>
            </div>
            <StatusControl
              projectId={projectId}
              status={data.project.status}
              canManage={canManage}
              onChanged={invalidate}
            />
          </header>

          <StagePipeline
            projectId={projectId}
            stages={data.stages}
            currentStage={currentStage}
            percentByStage={percentByStage}
            canManage={canManage}
            onChanged={invalidate}
          />

          <div className="flex w-full items-start gap-[20px]">
            <ProgressCard metrics={data.metrics} />
            <NeedsAttentionCard
              projectId={projectId}
              overdueActivities={overdueActivities}
              draftWeekStart={draftSubmission?.week_start ?? null}
              escalations={escalations}
            />
          </div>

          <NextMilestonesRow projectId={projectId} milestones={milestones} />

          <TeamSection projectId={projectId} team={team} clientContacts={clientContacts} />
        </main>
      </div>
    </div>
  );
}
