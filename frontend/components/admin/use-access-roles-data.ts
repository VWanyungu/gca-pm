"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export interface AccessRole {
  access_role_id: number;
  name: string;
  is_system: boolean;
  sort_order: number;
  is_active: boolean;
}

/** The access_role catalog — single source of truth for every "grant access" role dropdown. */
export function useAccessRoles(includeInactive = false) {
  return useQuery({
    queryKey: ["admin", "access-roles", { includeInactive }],
    queryFn: async () =>
      unwrap(
        await api.get<{ roles: AccessRole[] }>(
          `/access-roles${includeInactive ? "?includeInactive=true" : ""}`,
        ),
      ).roles,
    staleTime: 60_000,
  });
}

function useInvalidateAccessRoles() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin", "access-roles"] });
}

export function useCreateAccessRole() {
  const invalidate = useInvalidateAccessRoles();
  return useMutation({
    mutationFn: async (input: { name: string; sort_order: number }) =>
      unwrap(await api.post<{ role: AccessRole }>("/access-roles", input)).role,
    onSuccess: invalidate,
  });
}

export function useUpdateAccessRole(id: number) {
  const invalidate = useInvalidateAccessRoles();
  return useMutation({
    mutationFn: async (input: { name?: string; sort_order?: number; is_active?: boolean }) =>
      unwrap(await api.patch<{ role: AccessRole }>(`/access-roles/${id}`, input)).role,
    onSuccess: invalidate,
  });
}

export function useDeactivateAccessRole() {
  const invalidate = useInvalidateAccessRoles();
  return useMutation({
    mutationFn: async (id: number) => unwrap(await api.delete<{ role: AccessRole }>(`/access-roles/${id}`)).role,
    onSuccess: invalidate,
  });
}
