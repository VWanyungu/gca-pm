"use client";

import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { SystemStateScreen } from "@/components/system-state/system-state-screen";
import { useProjectSidebarData } from "@/components/project-overview/project-sidebar-context";
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
  // useOpenEscalations, // paused: no escalations module yet
  useDraftSubmission,
  ApiError,
} from "@/components/project-overview/use-project-data";
import {
  mondayOf,
  addDays,
  formatWeekPeriod,
  weekNumber,
} from "../../../../components/weekly-submission/types";

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

  const today = new Date();

  // const weekNumber = Math.ceil(
  //   (today.getTime() - new Date(data.project.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000),
  // );
  const weekStart = addDays(mondayOf(new Date()), 0 * 7);

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[28px] p-[20px] md:p-[40px]">
      <header className="flex w-full flex-col gap-[16px] md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 flex-col gap-[8px]">
          <h1 className="text-[24px] font-semibold tracking-[-0.75px] text-gca-dark sm:text-[30px]">
            {data.project.name}
          </h1>
          <p className="text-[14px] text-gca-show">
            {data.project.client_name ?? "—"} · Week {weekNumber(weekStart)}
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

      <TeamSection projectId={projectId} team={team} clientContacts={clientContacts} />
    </main>
  );
}
