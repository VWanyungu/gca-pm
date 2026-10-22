"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { DprAmendment } from "@/components/weekly-submission/types";
import type { DprDraftInput } from "@/components/engineer-dpr/types";
import { requestDprAmendment } from "@/components/engineer-dpr/use-dpr-wizard-data";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

function useInvalidateDprActions(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "dprs"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "dpr-amendments"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "dpr-missed-dates"] });
  };
}

export function useMissedDprDates(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["project", projectId, "dpr-missed-dates"],
    queryFn: async () =>
      unwrap(await api.get<{ missed_dates: string[] }>(`/projects/${projectId}/dpr/missed-dates`))
        .missed_dates,
    enabled: !!projectId && enabled,
    staleTime: 30_000,
  });
}

export function useDprAmendments(projectId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["project", projectId, "dpr-amendments"],
    queryFn: async () =>
      unwrap(
        await api.get<{ amendments: DprAmendment[] }>(
          `/projects/${projectId}/dpr/amendments?status=pending`,
        ),
      ).amendments,
    enabled: !!projectId && enabled,
    staleTime: 10_000,
  });
}

export function useDeleteDpr(projectId: string) {
  const invalidate = useInvalidateDprActions(projectId);
  return useMutation({
    mutationFn: async (dprId: string) => {
      const result = await api.delete(`/projects/${projectId}/dpr/${dprId}`);
      if (result.status !== "success") throw new Error(result.message);
    },
    onSuccess: invalidate,
  });
}

export function useRequestDprAmendment(projectId: string) {
  const invalidate = useInvalidateDprActions(projectId);
  return useMutation({
    mutationFn: (input: { dprId: string; draft: DprDraftInput; reason: string }) =>
      requestDprAmendment(projectId, input.dprId, input.draft, input.reason),
    onSuccess: invalidate,
  });
}

export function useDecideDprAmendment(projectId: string) {
  const invalidate = useInvalidateDprActions(projectId);
  return useMutation({
    mutationFn: async (input: {
      amendmentId: string;
      decision: "approve" | "reject";
      decisionNote?: string;
    }) =>
      unwrap(
        await api.post<{ amendment: DprAmendment }>(
          `/projects/${projectId}/dpr/amendments/${input.amendmentId}/decide`,
          { decision: input.decision, decision_note: input.decisionNote },
        ),
      ).amendment,
    onSuccess: invalidate,
  });
}
