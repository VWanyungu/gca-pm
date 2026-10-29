"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  canAccess,
  CAN_DECIDE_CHANGE_REQUEST,
  CAN_RAISE_CHANGE_REQUEST,
} from "@/lib/access-control";
import { useProjectDetail, useProjectTeam } from "@/components/project-overview/use-project-data";
import type { StageRow } from "@/components/project-overview/types";
import { ChangeRequestsTable } from "./change-requests-table";
import { ChangeRequestDetail } from "./change-request-detail";
import { ChangeRequestForm } from "./change-request-form";
import { useChangeRequest } from "./use-change-requests-data";

type SubView =
  | { mode: "list" }
  | { mode: "add" }
  | { mode: "edit"; changeId: string }
  | { mode: "detail"; changeId: string };

export function ChangeRequestsView({ projectId }: { projectId: string }) {
  const { user } = useAuth();
  const { data: project } = useProjectDetail(projectId);
  const { data: team = [] } = useProjectTeam(projectId);
  const [subView, setSubView] = useState<SubView>({ mode: "list" });

  const canRaise = canAccess(user?.role, CAN_RAISE_CHANGE_REQUEST, { projectId });
  const canDecide = canAccess(user?.role, CAN_DECIDE_CHANGE_REQUEST);

  if (!project) return null;

  return (
    <main className="flex w-full max-w-[1200px] flex-col gap-[20px] p-[20px] md:p-[40px]">
      {subView.mode === "list" && (
        <ChangeRequestsTable
          projectId={projectId}
          stages={project.stages}
          canRaise={canRaise}
          onRaise={() => setSubView({ mode: "add" })}
          onOpen={(changeId) => setSubView({ mode: "detail", changeId })}
        />
      )}

      {subView.mode === "detail" && (
        <ChangeRequestDetail
          projectId={projectId}
          changeId={subView.changeId}
          team={team}
          stages={project.stages}
          currentUserId={user?.userId}
          canRaise={canRaise}
          canDecide={canDecide}
          onBack={() => setSubView({ mode: "list" })}
          onEdit={() => setSubView({ mode: "edit", changeId: subView.changeId })}
        />
      )}

      {subView.mode === "add" && (
        <ChangeRequestForm
          projectId={projectId}
          projectName={project.project.name}
          stages={project.stages}
          onDone={() => setSubView({ mode: "list" })}
          onCancel={() => setSubView({ mode: "list" })}
        />
      )}

      {subView.mode === "edit" && (
        <EditChangeRequest
          projectId={projectId}
          projectName={project.project.name}
          changeId={subView.changeId}
          stages={project.stages}
          onDone={(changeId) => setSubView({ mode: "detail", changeId })}
          onCancel={() => setSubView({ mode: "detail", changeId: subView.changeId })}
        />
      )}
    </main>
  );
}

function EditChangeRequest({
  projectId,
  projectName,
  changeId,
  stages,
  onDone,
  onCancel,
}: {
  projectId: string;
  projectName: string;
  changeId: string;
  stages: StageRow[];
  onDone: (changeId: string) => void;
  onCancel: () => void;
}) {
  const { data: cr } = useChangeRequest(projectId, changeId);
  if (!cr) return null;
  return (
    <ChangeRequestForm
      projectId={projectId}
      projectName={projectName}
      stages={stages}
      editing={cr}
      onDone={() => onDone(changeId)}
      onCancel={onCancel}
    />
  );
}
