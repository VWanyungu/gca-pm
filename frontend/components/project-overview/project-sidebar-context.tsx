"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useProjectDetail, useSidebarCounts, useStageActivities } from "./use-project-data";
import type { StageRow } from "./types";

export type ActiveKey =
  | "overview"
  | "team"
  | "stages"
  | "risks"
  | "change-requests"
  | "milestones"
  | "schedule"
  | "submit"
  | "dpr"
  | "settings";

const ACTIVE_KEYS_BY_SEGMENT: Record<string, ActiveKey> = {
  team: "team",
  stages: "stages",
  risks: "risks",
  "change-requests": "change-requests",
  milestones: "milestones",
  schedule: "schedule",
  "weekly-submission": "submit",
  dpr: "dpr",
  settings: "settings",
};

function deriveActive(
  pathname: string,
  projectId: string,
): { active: ActiveKey; activeStageNo?: number } {
  const base = `/projects/${projectId}`;
  const rest = pathname.startsWith(base) ? pathname.slice(base.length) : "";
  const [first, second] = rest.split("/").filter(Boolean);

  if (first === "stages") {
    const stageNo = Number(second);
    return { active: "stages", activeStageNo: Number.isFinite(stageNo) ? stageNo : undefined };
  }

  return { active: ACTIVE_KEYS_BY_SEGMENT[first] ?? "overview" };
}

interface ProjectSidebarData {
  projectId: string;
  stages: StageRow[];
  counts?: { submit: number; risks: number; changeRequests: number };
  percentByStage: Record<number, number>;
  active: ActiveKey;
  activeStageNo?: number;
}

const ProjectSidebarContext = createContext<ProjectSidebarData | null>(null);

export function ProjectSidebarProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const { data } = useProjectDetail(projectId);
  const { data: counts } = useSidebarCounts(projectId);
  const { data: activities = [] } = useStageActivities(projectId);

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

  const { active, activeStageNo } = useMemo(
    () => deriveActive(pathname, projectId),
    [pathname, projectId],
  );

  const value = useMemo<ProjectSidebarData>(
    () => ({
      projectId,
      stages: data?.stages ?? [],
      counts,
      percentByStage,
      active,
      activeStageNo,
    }),
    [projectId, data?.stages, counts, percentByStage, active, activeStageNo],
  );

  return <ProjectSidebarContext.Provider value={value}>{children}</ProjectSidebarContext.Provider>;
}

export function useProjectSidebarData() {
  const ctx = useContext(ProjectSidebarContext);
  if (!ctx) throw new Error("useProjectSidebarData must be used within a ProjectSidebarProvider");
  return ctx;
}
