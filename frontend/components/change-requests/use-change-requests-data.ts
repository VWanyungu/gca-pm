"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ChangeRequest, ChangeRequestStatus, ChangeRequestType } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export function useChangeRequests({
  projectId,
  stageNo,
  type,
  status,
  search,
  page,
  limit = 6,
}: {
  projectId: string;
  stageNo?: number;
  type?: ChangeRequestType;
  status?: ChangeRequestStatus;
  search?: string;
  page: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["project", projectId, "change-requests", { stageNo, type, status, search, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (stageNo) params.set("stage_no", String(stageNo));
      if (type) params.set("type", type);
      if (status) params.set("status", status);
      if (search?.trim()) params.set("search", search.trim());
      return unwrap(
        await api.get<{
          changeRequests: ChangeRequest[];
          pagination: { page: number; limit: number; total: number; pages: number };
        }>(`/projects/${projectId}/change-requests?${params.toString()}`),
      );
    },
    staleTime: 10_000,
  });
}

export function useChangeRequest(projectId: string, changeId: string) {
  return useQuery({
    queryKey: ["project", projectId, "change-request", changeId],
    queryFn: async () =>
      unwrap(
        await api.get<{ changeRequest: ChangeRequest }>(`/projects/${projectId}/change-requests/${changeId}`),
      ).changeRequest,
    staleTime: 10_000,
    enabled: !!changeId,
  });
}

export function useChangeRequestsInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "change-requests"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "change-request"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "sidebar-counts"] });
  };
}
