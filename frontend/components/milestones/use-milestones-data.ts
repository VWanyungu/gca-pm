"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CustomMilestone, MilestoneRow } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

/** All milestones (schedule + custom), merged and unpaginated; chart and table filter/paginate client-side. */
export function useAllMilestones(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "milestones", "all"],
    queryFn: async () =>
      unwrap(await api.get<{ milestones: MilestoneRow[] }>(`/projects/${projectId}/milestones?aggregate=true`))
        .milestones,
    staleTime: 10_000,
  });
}

export function useCustomMilestone(projectId: string, milestoneId: string) {
  return useQuery({
    queryKey: ["project", projectId, "custom-milestone", milestoneId],
    queryFn: async () =>
      unwrap(
        await api.get<{ milestone: CustomMilestone }>(`/projects/${projectId}/custom-milestones/${milestoneId}`),
      ).milestone,
    staleTime: 10_000,
    enabled: !!milestoneId,
  });
}

export function useMilestonesInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "milestones"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "custom-milestone"] });
  };
}
