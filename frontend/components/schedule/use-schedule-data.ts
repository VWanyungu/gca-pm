"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, downloadFile } from "@/lib/api-client";
import type { OverdueTask, ReconciliationFlag, ScheduleTask, ScheduleVersion, ScopeMode, VersionChange } from "./types";

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
    enabled: !!projectId,
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

/** The .mpp goes up as base64 in the JSON body, which is how this API takes files. */
function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.readAsDataURL(file);
  });
}

export interface UploadScheduleInput {
  file: File;
  scopeMode: ScopeMode;
  rebaseline: boolean;
  notes: string;
}

/** POSTs the file and returns the queued version. Parsing happens server-side afterwards, so
 *  the caller polls useScheduleVersion for the outcome. */
export function useUploadSchedule(projectId: string) {
  return useMutation({
    mutationFn: async (input: UploadScheduleInput) =>
      unwrap(
        await api.post<{ schedule_version_id: string; duplicate_of_version_no: number | null }>(
          `/projects/${projectId}/schedule/upload`,
          {
            file: await toBase64(input.file),
            filename: input.file.name,
            scope_mode: input.scopeMode,
            rebaseline: input.rebaseline,
            notes: input.notes || undefined,
          },
        ),
      ),
  });
}

/** The exact bytes a version was uploaded from (AC-SCH-42) — history's byte-for-byte download. */
export function downloadScheduleVersionFile(projectId: string, version: ScheduleVersion) {
  return downloadFile(
    `/projects/${projectId}/schedule/versions/${version.schedule_version_id}/download`,
    `schedule-v${version.version_no}.mpp`,
  );
}

/** Current task data, including write-backs no uploaded file knows about, as MSPDI XML — the
 *  main schedule screen's "Export" action. Not a .mpp: MPXJ has no binary .mpp writer. */
export function exportScheduleFile(projectId: string, projectName: string) {
  return downloadFile(`/projects/${projectId}/schedule/export`, `${projectName}-schedule.xml`);
}

/** Polls one version while it is queued or parsing, then stops. */
export function useScheduleVersion(projectId: string, versionId: string | null) {
  return useQuery({
    queryKey: ["project", projectId, "schedule", "versions", versionId],
    queryFn: async () =>
      unwrap(
        await api.get<{ version: ScheduleVersion }>(`/projects/${projectId}/schedule/versions/${versionId}`),
      ).version,
    enabled: !!versionId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "queued" || status === "parsing" ? 1500 : false;
    },
  });
}
