"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { OverdueTask, ReconciliationFlag, ScheduleTask, ScheduleVersion, VersionChange } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export function useScheduleVersions(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "versions"],
    queryFn: async () =>
      unwrap(await api.get<{ versions: ScheduleVersion[] }>(`/projects/${projectId}/schedule/versions`)).versions,
    staleTime: 60_000,
  });
}

export function useScheduleTasks(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "tasks"],
    queryFn: async () =>
      unwrap(await api.get<{ tasks: ScheduleTask[] }>(`/projects/${projectId}/schedule/tasks`)).tasks,
    staleTime: 10_000,
  });
}

export function useOverdueTasks(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "overdue"],
    queryFn: async () =>
      unwrap(await api.get<{ tasks: OverdueTask[] }>(`/projects/${projectId}/schedule/overdue`)).tasks,
    staleTime: 10_000,
  });
}

export function useReconciliationFlags(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "reconciliation-flags"],
    queryFn: async () =>
      unwrap(
        await api.get<{ flags: ReconciliationFlag[] }>(`/projects/${projectId}/schedule/reconciliation-flags`),
      ).flags,
    staleTime: 10_000,
  });
}

export function useVersionChanges(projectId: string, versionId: string | null) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "versions", versionId, "changes"],
    queryFn: async () =>
      unwrap(
        await api.get<{ changes: VersionChange[] }>(
          `/projects/${projectId}/schedule/versions/${versionId}/changes`,
        ),
      ).changes,
    enabled: !!versionId,
    staleTime: 60_000,
  });
}

export function useScheduleInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["project", projectId, "schedule"] });
}
