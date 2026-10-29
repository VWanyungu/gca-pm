"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdminProjectDetail, AdminProjectListItem, ProjectStatus } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  // `data: null` is a valid success payload (e.g. delete endpoints) — only a
  // non-"success" status is an actual error.
  if (res.status !== "success") throw new Error(res.message);
  return res.data as T;
}

export function useAdminProjects({
  page,
  limit = 10,
  search,
  status,
  programId,
}: {
  page: number;
  limit?: number;
  search?: string;
  status?: ProjectStatus;
  programId?: number;
}) {
  return useQuery({
    queryKey: ["admin", "projects", "list", { page, limit, search, status, programId }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (programId) params.set("program_id", String(programId));
      return unwrap(
        await api.get<{
          projects: AdminProjectListItem[];
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        }>(`/projects?${params.toString()}`),
      );
    },
    staleTime: 10_000,
  });
}

export interface AdminProjectStage {
  stage_no: number;
  stage_name: string;
  state: "not_started" | "active" | "inactive" | "complete";
}

export function useAdminProject(id: string) {
  return useQuery({
    queryKey: ["admin", "projects", id],
    queryFn: async () =>
      unwrap(
        await api.get<{ project: AdminProjectDetail; stages: AdminProjectStage[] }>(`/projects/${id}`),
      ),
    enabled: !!id,
    staleTime: 10_000,
  });
}

function useInvalidateProjects() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "projects"] });
    if (id) queryClient.invalidateQueries({ queryKey: ["admin", "projects", id] });
  };
}

export function useUpdateProject(id: string) {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: async (input: {
      name?: string;
      client_name?: string | null;
      program_id?: number;
      expected_start_date?: string | null;
      expected_end_date?: string | null;
      site_location?: string | null;
      is_mechanical?: boolean;
      is_civil?: boolean;
      is_electrical?: boolean;
    }) => unwrap(await api.patch<{ project: AdminProjectDetail }>(`/projects/${id}`, input)).project,
    onSuccess: () => invalidate(id),
  });
}

export function useDeleteProject() {
  const invalidate = useInvalidateProjects();
  return useMutation({
    mutationFn: async (id: string) => unwrap(await api.delete(`/projects/${id}`)),
    onSuccess: () => invalidate(),
  });
}
