"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { canAccess, CAN_MANAGE_PROJECT } from "@/lib/access-control";
import { ProjectSidebar } from "@/components/project-overview/project-sidebar";
import {
  useProjectDetail,
  useProjectTeam,
  useSidebarCounts,
} from "@/components/project-overview/use-project-data";
import type { StageRow, TeamMember } from "@/components/project-overview/types";
import { RisksTable } from "./risks-table";
import { RiskDetail } from "./risk-detail";
import { RiskForm } from "./risk-form";
import { useRisk } from "./use-risks-data";

type SubView = { mode: "list" } | { mode: "add" } | { mode: "edit"; riskId: string } | { mode: "detail"; riskId: string };

export function RisksView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const [subView, setSubView] = useState<SubView>({ mode: "list" });

  const canManage = canAccess(user?.role, CAN_MANAGE_PROJECT, { projectId });

  if (!project) return null;

  return (
    <div className="flex min-h-[calc(100vh-64px)] w-full">
      <ProjectSidebar projectId={projectId} stages={project.stages} counts={counts} active="risks" />

      <div className="flex w-full justify-center">
        <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[40px]">
          {subView.mode === "list" && (
            <RisksTable
              projectId={projectId}
              team={team}
              canManage={canManage}
              onAddRisk={() => setSubView({ mode: "add" })}
              onOpenRisk={(riskId) => setSubView({ mode: "detail", riskId })}
            />
          )}

          {subView.mode === "detail" && (
            <RiskDetail
              projectId={projectId}
              riskId={subView.riskId}
              team={team}
              canManage={canManage}
              onBack={() => setSubView({ mode: "list" })}
              onEdit={() => setSubView({ mode: "edit", riskId: subView.riskId })}
            />
          )}

          {subView.mode === "add" && (
            <RiskForm
              projectId={projectId}
              projectName={project.project.name}
              stages={project.stages}
              team={team}
              onDone={() => setSubView({ mode: "list" })}
              onCancel={() => setSubView({ mode: "list" })}
            />
          )}

          {subView.mode === "edit" && (
            <EditRisk
              projectId={projectId}
              projectName={project.project.name}
              riskId={subView.riskId}
              stages={project.stages}
              team={team}
              onDone={(riskId) => setSubView({ mode: "detail", riskId })}
              onCancel={() => setSubView({ mode: "detail", riskId: subView.riskId })}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function EditRisk({
  projectId,
  projectName,
  riskId,
  stages,
  team,
  onDone,
  onCancel,
}: {
  projectId: string;
  projectName: string;
  riskId: string;
  stages: StageRow[];
  team: TeamMember[];
  onDone: (riskId: string) => void;
  onCancel: () => void;
}) {
  const { data: risk } = useRisk(projectId, riskId);
  if (!risk) return null;
  return (
    <RiskForm
      projectId={projectId}
      projectName={projectName}
      stages={stages}
      team={team}
      editing={risk}
      onDone={() => onDone(riskId)}
      onCancel={onCancel}
    />
  );
}
