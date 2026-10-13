"use client";

import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
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
} from "@/components/project-overview/use-project-data";

export default function ProjectOverview({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data, isLoading, error } = useProjectDetail(projectId);
  const invalidate = useProjectDetailInvalidate(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: clientContacts = [] } = useClientContacts(projectId);
  const { data: activities = [] } = useStageActivities(projectId);
  const { data: milestones = [] } = useMilestones(projectId);
  const { data: escalations = [] } = useOpenEscalations(projectId);
  const { data: draftSubmission } = useDraftSubmission(projectId);
  const { data: counts } = useSidebarCounts(projectId);

  if (isLoading) return null;
  if (error || !data) {
    return <p className="p-[40px] text-[14px] text-error-text">{error?.message ?? "Project not found"}</p>;
  }

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });

  const percentByStage: Record<number, number> = {};
  for (const stage of data.stages) {
    const stageActivities = activities.filter((a) => a.stage_no === stage.stage_no);
    if (stageActivities.length > 0) {
      const done = stageActivities.filter((a) => a.status === "done").length;
      percentByStage[stage.stage_no] = Math.round((done / stageActivities.length) * 100);
    }
  }

  const today = new Date();
  const overdueActivities = activities.filter(
    (a) => a.status === "open" && a.due_date && new Date(a.due_date) < today,
  );

  const weekNumber = Math.ceil(
    (today.getTime() - new Date(data.project.created_at).getTime()) / (7 * 24 * 60 * 60 * 1000),
  );

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={data.stages} counts={counts} active="overview" />

      <main className="flex w-full flex-col gap-[28px] p-[40px]">
        <header className="flex w-full items-center justify-between">
          <div className="flex flex-col gap-[8px]">
            <h1 className="text-[30px] font-semibold tracking-[-0.75px] text-gca-dark">{data.project.name}</h1>
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
  );
}
