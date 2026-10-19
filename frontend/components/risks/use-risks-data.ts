"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { Risk, RiskCategory, RiskRating, RiskStatus, RiskSource } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export function useRisks({
  projectId,
  stageNo,
  source,
  status,
  rating,
  search,
  page,
  limit = 6,
}: {
  projectId: string;
  stageNo?: number;
  source?: RiskSource;
  status?: RiskStatus;
  rating?: RiskRating;
  search?: string;
  page: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["project", projectId, "risks", { stageNo, source, status, rating, search, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (stageNo) params.set("stage_no", String(stageNo));
      if (source) params.set("source", source);
      if (status) params.set("status", status);
      if (rating) params.set("rating", rating);
      if (search?.trim()) params.set("search", search.trim());
      return unwrap(
        await api.get<{
          riskIssues: Risk[];
          pagination: { page: number; limit: number; total: number; pages: number };
        }>(`/projects/${projectId}/risks?${params.toString()}`),
      );
    },
    staleTime: 10_000,
  });
}

export function useRisk(projectId: string, riskId: string) {
  return useQuery({
    queryKey: ["project", projectId, "risk", riskId],
    queryFn: async () =>
      unwrap(await api.get<{ riskIssue: Risk }>(`/projects/${projectId}/risks/${riskId}`)).riskIssue,
    staleTime: 10_000,
    enabled: !!riskId,
  });
}

export function useRiskCategories(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "risk-categories"],
    queryFn: async () =>
      unwrap(await api.get<{ categories: RiskCategory[] }>(`/projects/${projectId}/risks/categories`))
        .categories,
    staleTime: 5 * 60_000,
  });
}

export function useRisksInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "risks"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "risk"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "sidebar-counts"] });
  };
}
