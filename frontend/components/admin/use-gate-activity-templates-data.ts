"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

export interface GateActivityTemplate {
  template_id: string;
  stage_no: 0 | 11;
  title: string;
  description: string | null;
  requires_attachment: boolean;
  due_offset_days: number | null;
  sort_order: number;
  is_active: boolean;
}

export interface GateActivityTemplateInput {
  stage_no: 0 | 11;
  title: string;
  description?: string | null;
  requires_attachment?: boolean;
  due_offset_days?: number | null;
  sort_order?: number;
}

/** The predefined Kickoff/Closure activities admin maintains — copied onto a project at creation. */
export function useGateActivityTemplates(includeInactive = false) {
  return useQuery({
    queryKey: ["admin", "gate-activity-templates", { includeInactive }],
    queryFn: async () =>
      unwrap(
        await api.get<{ templates: GateActivityTemplate[] }>(
          `/pdm-gate-activity-templates${includeInactive ? "?includeInactive=true" : ""}`,
        ),
      ).templates,
    staleTime: 60_000,
  });
}

function useInvalidateGateActivityTemplates() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["admin", "gate-activity-templates"] });
}

export function useCreateGateActivityTemplate() {
  const invalidate = useInvalidateGateActivityTemplates();
  return useMutation({
    mutationFn: async (input: GateActivityTemplateInput) =>
      unwrap(
        await api.post<{ template: GateActivityTemplate }>("/pdm-gate-activity-templates", input),
      ).template,
    onSuccess: invalidate,
  });
}

export function useUpdateGateActivityTemplate(templateId: string) {
  const invalidate = useInvalidateGateActivityTemplates();
  return useMutation({
    mutationFn: async (
      input: Partial<Omit<GateActivityTemplateInput, "stage_no">> & { is_active?: boolean },
    ) =>
      unwrap(
        await api.patch<{ template: GateActivityTemplate }>(
          `/pdm-gate-activity-templates/${templateId}`,
          input,
        ),
      ).template,
    onSuccess: invalidate,
  });
}

export function useDeactivateGateActivityTemplate() {
  const invalidate = useInvalidateGateActivityTemplates();
  return useMutation({
    mutationFn: async (templateId: string) =>
      unwrap(
        await api.delete<{ template: GateActivityTemplate }>(
          `/pdm-gate-activity-templates/${templateId}`,
        ),
      ).template,
    onSuccess: invalidate,
  });
}
