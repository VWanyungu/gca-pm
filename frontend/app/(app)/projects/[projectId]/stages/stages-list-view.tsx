"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useProjectDetail, useStageActivities } from "@/components/project-overview/use-project-data";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import { STAGE_SHORT_NAME } from "@/components/project-overview/types";

const STATE_LABEL: Record<string, string> = {
  not_started: "Not started",
  active: "In progress",
  inactive: "Paused",
  complete: "Done",
};

export default function StagesListView({ projectId }: { projectId: string }) {
  const { data: project } = useProjectDetail(projectId);
  const { data: activities = [] } = useStageActivities(projectId);

  if (!project) return null;

  const sorted = [...project.stages].sort((a, b) => a.stage_no - b.stage_no);
  const percentByStage: Record<number, number> = {};
  for (const stage of sorted) {
    const stageActivities = activities.filter((a) => a.stage_no === stage.stage_no);
    if (stageActivities.length > 0) {
      const done = stageActivities.filter((a) => a.status === "done").length;
      percentByStage[stage.stage_no] = Math.round((done / stageActivities.length) * 100);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={project.stages} percentByStage={percentByStage} active="stages" />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
          <h1 className="text-[24px] font-semibold tracking-[-0.36px] text-gca-dark">All stages</h1>

          <div className="flex flex-col">
            {sorted.map((stage, i) => (
              <Link
                key={stage.stage_no}
                href={`/projects/${projectId}/stages/${stage.stage_no}`}
                className={`flex items-center justify-between py-[14px] ${i > 0 ? "border-t border-gca-border" : ""} ${
                  !stage.in_scope ? "opacity-50" : ""
                }`}
              >
                <div className="flex flex-col gap-[2px]">
                  <p className="text-[14px] font-medium text-gca-dark">
                    {STAGE_SHORT_NAME[stage.stage_no] ?? stage.stage_name}
                  </p>
                  <p className="text-[12px] text-gca-muted">{stage.in_scope ? "In scope" : "Out of scope"}</p>
                </div>
                <div className="flex items-center gap-[16px]">
                  <span className="font-mono text-[13px] text-gca-muted">
                    {stage.state === "active" ? `${percentByStage[stage.stage_no] ?? 0}%` : STATE_LABEL[stage.state]}
                  </span>
                  <ChevronRight className="size-[14px] text-gca-muted" />
                </div>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
