"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  WeeklySubmission,
  WeeklySubmissionStatus,
  AddressedRiskMethod,
  SubmissionPhoto,
  DprSummary,
  DprDetail,
} from "./types";
import { addDays } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export function useWeeklySubmissions({
  projectId,
  status,
  weekStart,
  page = 1,
  limit = 25,
}: {
  projectId: string;
  status?: WeeklySubmissionStatus;
  weekStart?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["project", projectId, "weekly-submissions", { status, weekStart, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      if (weekStart) params.set("week_start", weekStart);
      return unwrap(
        await api.get<{
          submissions: WeeklySubmission[];
          pagination: { page: number; limit: number; total: number; pages: number };
        }>(`/projects/${projectId}/weekly-submission?${params.toString()}`),
      );
    },
    staleTime: 10_000,
  });
}

/** The draft or approved submission for a given week (at most one of each exists). */
export function useWeekSubmission(projectId: string, weekStart: string) {
  return useQuery({
    queryKey: ["project", projectId, "weekly-submission", "week", weekStart],
    queryFn: async () => {
      const { submissions } = unwrap(
        await api.get<{ submissions: WeeklySubmission[] }>(
          `/projects/${projectId}/weekly-submission?week_start=${weekStart}&limit=5`,
        ),
      );
      const draft = submissions.find((s) => s.status === "draft");
      const approved = submissions.find((s) => s.status === "approved");
      return { draft: draft ?? null, approved: approved ?? null };
    },
    staleTime: 10_000,
  });
}

export function useWeeklySubmission(projectId: string, submissionId: string | null | undefined) {
  return useQuery({
    queryKey: ["project", projectId, "weekly-submission", submissionId],
    queryFn: async () =>
      unwrap(
        await api.get<{ submission: WeeklySubmission }>(
          `/projects/${projectId}/weekly-submission/${submissionId}`,
        ),
      ).submission,
    enabled: !!submissionId,
    staleTime: 10_000,
  });
}

export function useWeekDprs(projectId: string, weekStart: string) {
  return useQuery({
    queryKey: ["project", projectId, "dprs", "week", weekStart],
    queryFn: async () =>
      unwrap(
        await api.get<{ dprs: DprSummary[] }>(
          `/projects/${projectId}/dpr?from_date=${weekStart}&to_date=${addDays(weekStart, 6)}&limit=100`,
        ),
      ).dprs,
    staleTime: 10_000,
  });
}

export function useDprs({
  projectId,
  status,
  page = 1,
  limit = 25,
}: {
  projectId: string;
  status?: "draft" | "submitted";
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ["project", projectId, "dprs", { status, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (status) params.set("status", status);
      return unwrap(
        await api.get<{
          dprs: DprSummary[];
          pagination: { page: number; limit: number; total: number; totalPages: number };
        }>(`/projects/${projectId}/dpr?${params.toString()}`),
      );
    },
    staleTime: 10_000,
  });
}

export function useDpr(projectId: string, dprId: string | null | undefined) {
  return useQuery({
    queryKey: ["project", projectId, "dpr", dprId],
    queryFn: async () =>
      unwrap(await api.get<{ dpr: DprDetail }>(`/projects/${projectId}/dpr/${dprId}`)).dpr,
    enabled: !!dprId,
    staleTime: 10_000,
  });
}

export function useSubmissionPhotos(projectId: string, submissionId: string | null | undefined) {
  return useQuery({
    queryKey: ["project", projectId, "weekly-submission", submissionId, "photos"],
    queryFn: async () =>
      unwrap(
        await api.get<{ photos: SubmissionPhoto[] }>(
          `/projects/${projectId}/weekly-submission/${submissionId}/photos`,
        ),
      ).photos,
    enabled: !!submissionId,
    staleTime: 10_000,
  });
}

export function useWeeklySubmissionInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "weekly-submission"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "weekly-submissions"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "sidebar-counts"] });
  };
}

export async function createWeeklySubmission(projectId: string, weekStart: string) {
  return unwrap(
    await api.post<{ submission: WeeklySubmission }>(`/projects/${projectId}/weekly-submission`, {
      week_start: weekStart,
    }),
  ).submission;
}

export async function updateWeeklySubmission(
  projectId: string,
  submissionId: string,
  body: Partial<{
    pm_commentary: string;
    scope_change_text: string;
    top_risk_id: string | null;
    top_risk_text: string | null;
    top_action: string | null;
    exco_decision_needed: string | null;
    escalate: boolean;
    escalation_reason: string | null;
  }>,
) {
  return unwrap(
    await api.patch<{ submission: WeeklySubmission }>(
      `/projects/${projectId}/weekly-submission/${submissionId}`,
      body,
    ),
  ).submission;
}

export async function approveWeeklySubmission(
  projectId: string,
  submissionId: string,
  body: {
    planned_pct?: number;
    actual_pct?: number;
    spi?: number | null;
    rag?: ProjectRagLiteral | null;
    schedule_version_id?: string | null;
  },
) {
  const res = await api.post<{ submission: WeeklySubmission }>(
    `/projects/${projectId}/weekly-submission/${submissionId}/approve`,
    body,
    { silent: true },
  );
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data.submission;
}

type ProjectRagLiteral = "green" | "amber" | "red";

export async function addAddressedRisk(
  projectId: string,
  submissionId: string,
  input: { risk_id: string; method: AddressedRiskMethod; dismissal_reason?: string | null },
) {
  const res = await api.post(
    `/projects/${projectId}/weekly-submission/${submissionId}/addressed-risks`,
    input,
    { silent: true },
  );
  if (res.status !== "success") throw new Error(res.message);
}

export async function removeAddressedRisk(projectId: string, submissionId: string, riskId: string) {
  const res = await api.delete(
    `/projects/${projectId}/weekly-submission/${submissionId}/addressed-risks/${riskId}`,
  );
  if (res.status !== "success") throw new Error(res.message);
}

export async function setSubmissionPhotos(
  projectId: string,
  submissionId: string,
  photoIds: string[],
) {
  const res = await api.put<{ photos: SubmissionPhoto[] }>(
    `/projects/${projectId}/weekly-submission/${submissionId}/photos`,
    { photo_ids: photoIds },
  );
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data.photos;
}
