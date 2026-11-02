"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { FeedbackRequest, FeedbackRatingSummary } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export function useFeedbackRequests(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "feedback-requests"],
    queryFn: async () =>
      unwrap(
        await api.get<{ requests: FeedbackRequest[]; summary: FeedbackRatingSummary }>(
          `/projects/${projectId}/feedback-requests`,
        ),
      ),
    staleTime: 10_000,
  });
}

export async function createFeedbackRequests(
  projectId: string,
  input: { contact_ids: string[]; expires_in_days: number },
): Promise<FeedbackRequest[]> {
  return unwrap(
    await api.post<{ requests: FeedbackRequest[] }>(`/projects/${projectId}/feedback-requests`, input),
  ).requests;
}

export async function deleteFeedbackRequest(projectId: string, requestId: string): Promise<void> {
  const res = await api.delete(`/projects/${projectId}/feedback-requests/${requestId}`);
  if (res.status !== "success") throw new Error(res.message);
}

export function useFeedbackRequestsInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["project", projectId, "feedback-requests"] });
}
