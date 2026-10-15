"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  StageDetail,
  StageActivity,
  StageActivityAttachment,
  ChecklistItem,
  StageRisk,
} from "@/components/project-overview/types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export function useProjectStage(projectId: string, stageNo: number) {
  return useQuery({
    queryKey: ["project", projectId, "stages", stageNo],
    queryFn: async () =>
      unwrap(await api.get<{ projectStage: StageDetail }>(`/projects/${projectId}/stages/${stageNo}`)).projectStage,
    staleTime: 30_000,
  });
}

export function useStageActivitiesPaged({
  projectId,
  stageNo,
  status,
  page,
  limit = 6,
}: {
  projectId: string;
  stageNo: number;
  status?: "open" | "done";
  page: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["project", projectId, "stages", stageNo, "activities", { status, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({ stage_no: String(stageNo), page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      return unwrap(
        await api.get<{ stageActivities: StageActivity[]; pagination: { total: number; pages: number } }>(
          `/projects/${projectId}/stage-activities?${params.toString()}`,
        ),
      );
    },
    staleTime: 10_000,
  });
}

export function useStageChecklist(projectId: string, stageNo: number) {
  return useQuery({
    queryKey: ["project", projectId, "stages", stageNo, "checklist"],
    queryFn: async () =>
      unwrap(await api.get<{ items: ChecklistItem[] }>(`/projects/${projectId}/stages/${stageNo}/checklist`)).items,
    staleTime: 10_000,
  });
}

export function useStageRisks(projectId: string, stageNo: number) {
  return useQuery({
    queryKey: ["project", projectId, "stages", stageNo, "risks"],
    queryFn: async () =>
      unwrap(
        await api.get<{ riskIssues: StageRisk[] }>(
          `/projects/${projectId}/risks?stage_no=${stageNo}&status=open&limit=10`,
        ),
      ).riskIssues,
    staleTime: 30_000,
  });
}

export function useActivity(projectId: string, activityId: string) {
  return useQuery({
    queryKey: ["project", projectId, "stage-activity", activityId],
    queryFn: async () =>
      unwrap(await api.get<{ stageActivity: StageActivity }>(`/projects/${projectId}/stage-activities/${activityId}`))
        .stageActivity,
    staleTime: 10_000,
  });
}

export function useActivityAttachments(projectId: string, activityId: string) {
  return useQuery({
    queryKey: ["project", projectId, "stage-activity", activityId, "attachments"],
    queryFn: async () =>
      unwrap(
        await api.get<{ attachments: StageActivityAttachment[] }>(
          `/projects/${projectId}/stage-activities/${activityId}/attachments`,
        ),
      ).attachments,
    staleTime: 10_000,
  });
}

export function useStageViewInvalidate(projectId: string, stageNo: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "stages", stageNo] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId] });
  };
}
