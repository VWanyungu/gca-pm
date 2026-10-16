"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  ProjectDetailResponse,
  TeamMember,
  ClientContact,
  StageActivity,
  Milestone,
  EscalationRow,
} from "./types";

export class ApiError extends Error {
  constructor(message: string, public httpStatus: number) {
    super(message);
    this.name = "ApiError";
  }
}

function unwrap<T>(res: { status: string; data: T | null; message: string; httpStatus?: number }): T {
  if (res.status !== "success" || !res.data) throw new ApiError(res.message, res.httpStatus ?? 500);
  return res.data;
}

export function useProjectDetail(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId],
    queryFn: async () =>
      unwrap(await api.get<ProjectDetailResponse>(`/projects/${projectId}`, { silent: true })),
    staleTime: 30_000,
  });
}

export function useProjectDetailInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["project", projectId] });
}

export function useProjectTeam(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "team"],
    queryFn: async () =>
      unwrap(
        await api.get<{ roles: TeamMember[] }>(`/roles?projectId=${projectId}&limit=100`, { silent: true }),
      ).roles,
    staleTime: 30_000,
  });
}

export function useClientContacts(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "client-contacts"],
    queryFn: async () =>
      unwrap(
        await api.get<{ contacts: ClientContact[] }>(`/projects/${projectId}/client-contacts`, { silent: true }),
      ).contacts,
    staleTime: 30_000,
  });
}

interface Pagination {
  pagination: { total: number };
}

export function useStageActivities(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "stage-activities"],
    queryFn: async () =>
      unwrap(
        await api.get<{ stageActivities: StageActivity[] } & Pagination>(
          `/projects/${projectId}/stage-activities?limit=100`,
          { silent: true },
        ),
      ).stageActivities,
    staleTime: 30_000,
  });
}

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "milestones"],
    queryFn: async () =>
      unwrap(
        await api.get<{ milestones: Milestone[] } & Pagination>(
          `/projects/${projectId}/milestones?limit=50`,
          { silent: true },
        ),
      ).milestones,
    staleTime: 30_000,
  });
}

export function useOpenEscalations(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "escalations", "open"],
    queryFn: async () =>
      unwrap(
        await api.get<{ escalations: EscalationRow[] } & Pagination>(
          `/projects/${projectId}/escalations?status=open&limit=25`,
          { silent: true },
        ),
      ).escalations,
    staleTime: 30_000,
  });
}

export function useDraftSubmission(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "weekly-submission", "draft"],
    queryFn: async () =>
      unwrap(
        await api.get<{ submissions: { week_start: string }[] } & Pagination>(
          `/projects/${projectId}/weekly-submission?status=draft&limit=1`,
          { silent: true },
        ),
      ).submissions[0] ?? null,
    staleTime: 30_000,
  });
}

export function useSidebarCounts(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "sidebar-counts"],
    queryFn: async () => {
      const [submissions, risks, changeRequests] = await Promise.all([
        api.get<Pagination>(`/projects/${projectId}/weekly-submission?status=draft&limit=1`, { silent: true }),
        api.get<Pagination>(`/projects/${projectId}/risks?status=open&limit=1`, { silent: true }),
        api.get<Pagination>(`/projects/${projectId}/change-requests?status=pending&limit=1`, { silent: true }),
      ]);
      return {
        submit: unwrap(submissions).pagination.total,
        risks: unwrap(risks).pagination.total,
        changeRequests: unwrap(changeRequests).pagination.total,
      };
    },
    staleTime: 30_000,
  });
}
