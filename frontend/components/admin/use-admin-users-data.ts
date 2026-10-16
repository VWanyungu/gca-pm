"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdminUserListItem, AdminUserDetail, RoleName, ScopeType } from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export function useAdminUsers({
  page,
  limit = 10,
  search,
  globalRole,
  status,
}: {
  page: number;
  limit?: number;
  search?: string;
  globalRole?: RoleName;
  status?: "active" | "deactivated";
}) {
  return useQuery({
    queryKey: ["admin", "users", { page, limit, search, globalRole, status }],
    queryFn: async () => {
      const params = new URLSearchParams({ type: "multiple", page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (globalRole) params.set("globalRole", globalRole);
      if (status) params.set("status", status);
      return unwrap(
        await api.get<{
          response: {
            users: AdminUserListItem[];
            pagination: { page: number; limit: number; total: number; pages: number };
            activeCount: number;
          };
        }>(`/users?${params.toString()}`),
      ).response;
    },
    staleTime: 10_000,
  });
}

export function useAdminUser(id: string) {
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: async () => unwrap(await api.get<{ user: AdminUserDetail }>(`/users/${id}`)).user,
    enabled: !!id,
    staleTime: 10_000,
  });
}

function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return (id?: string) => {
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    if (id) queryClient.invalidateQueries({ queryKey: ["admin", "users", id] });
  };
}

export function useCreateUser() {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (input: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string | null;
      globalRole?: RoleName | null;
    }) => unwrap(await api.post<{ user: AdminUserDetail }>("/users", input)).user,
    onSuccess: () => invalidate(),
  });
}

export function useUpdateUser(id: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (input: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      globalRole?: RoleName | null;
    }) => unwrap(await api.put<{ user: AdminUserDetail }>(`/users/${id}`, input)).user,
    onSuccess: () => invalidate(id),
  });
}

export function useSetUserStatus(id: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (status: "active" | "deactivated") =>
      unwrap(await api.patch<{ user: AdminUserDetail }>(`/users/${id}/status`, { status })).user,
    onSuccess: () => invalidate(id),
  });
}

export function useGrantRole(userId: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (input: {
      role: RoleName;
      scopeType: ScopeType;
      programId?: number | null;
      projectId?: string | null;
    }) => unwrap(await api.post<{ attributeId: string }>("/roles", { userId, ...input })),
    onSuccess: () => invalidate(userId),
  });
}

export function useRevokeRole(userId: string) {
  const invalidate = useInvalidateUsers();
  return useMutation({
    mutationFn: async (attributeId: string) => unwrap(await api.delete(`/roles/${attributeId}`)),
    onSuccess: () => invalidate(userId),
  });
}

export function useProgramsList() {
  return useQuery({
    queryKey: ["admin", "programs"],
    queryFn: async () =>
      unwrap(await api.get<{ programs: { program_id: number; name: string }[] }>("/programs?limit=100"))
        .programs,
    staleTime: 60_000,
  });
}

export interface AssignableUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

/** All users, for populating a user picker (same source the project-wizard/team-view use). */
export function useAssignableUsers() {
  return useQuery({
    queryKey: ["admin", "users", "assignable"],
    queryFn: async () =>
      unwrap(await api.get<{ response: { users: AssignableUser[] } }>("/users?type=multiple&limit=100")).response.users,
    staleTime: 60_000,
  });
}

export interface ProjectRoleGrant {
  attribute_id: string;
  user_id: string;
  role: RoleName;
  granted_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

/** Current active role grants on a project (used to populate the reassign-main-role picker). */
export function useProjectRoles(projectId: string | null) {
  return useQuery({
    queryKey: ["admin", "project-roles", projectId],
    queryFn: async () =>
      unwrap(
        await api.get<{ roles: ProjectRoleGrant[] }>(`/roles?projectId=${projectId}&limit=100`),
      ).roles,
    enabled: !!projectId,
    staleTime: 10_000,
  });
}

export function useReassignMainRole() {
  const invalidate = useInvalidateUsers();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { projectId: string; role: "PM" | "Planner"; newUserId: string; reason?: string | null }) =>
      unwrap(await api.post<{ attributeId: string }>("/roles/reassign-main", input)),
    onSuccess: (_data, variables) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["admin", "project-roles", variables.projectId] });
    },
  });
}

export function useProjectsList() {
  return useQuery({
    queryKey: ["admin", "projects"],
    queryFn: async () =>
      unwrap(await api.get<{ projects: { project_id: string; name: string }[] }>("/projects?limit=100"))
        .projects,
    staleTime: 60_000,
  });
}
