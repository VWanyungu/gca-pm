"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useAuth } from "@/hooks/use-auth";
import type { DprDetail, DprSummary } from "@/components/weekly-submission/types";
import type { Milestone, ProjectDetailResponse } from "@/components/project-overview/types";
import type {
  DprDraftInput,
  EngineerProject,
  PersonnelRole,
  ProjectContractorOption,
  WeatherCategory,
} from "./types";

function unwrap<T>(res: { status: string; data: T | null; message: string }): T {
  if (res.status !== "success" || !res.data) throw new Error(res.message);
  return res.data;
}

/**
 * There's no `GET /projects` access for a project-scoped SiteEngineer (that endpoint only
 * authorizes SiteEngineer@global — see `projectsRouter.ts`'s `canListProjects`), so this
 * reads the engineer's project assignments straight out of their JWT role grants
 * (`user.role`, already decoded client-side by `AuthProvider`) and fetches each project
 * individually via `GET /projects/:projectId`, which DOES authorize SiteEngineer@project.
 */
export function useEngineerProjects() {
  const { user } = useAuth();
  const projectIds = Array.from(
    new Set(
      (user?.role ?? [])
        .filter((grant) => grant.role === "SiteEngineer" && grant.project_id)
        .map((grant) => grant.project_id as string),
    ),
  );

  const results = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ["project", projectId],
      queryFn: async () => unwrap(await api.get<ProjectDetailResponse>(`/projects/${projectId}`)),
      staleTime: 30_000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const projects: EngineerProject[] = results
    .filter((r) => r.data)
    .map((r) => ({
      project_id: r.data!.project.project_id,
      name: r.data!.project.name,
      current_stage_name: null,
      status: r.data!.project.status,
    }));

  return { data: projects, isLoading };
}

export interface EngineerProjectSummary {
  project_id: string;
  name: string;
  client_name: string | null;
  current_stage_name: string | null;
  status: string;
  spi: number | null;
  completed_pct: number | null;
  planned_pct: number | null;
  next_milestone: string | null;
}

/** Same per-project fetch useEngineerProjects relies on (no GET /projects access for a
 *  project-scoped SiteEngineer), mapped to the fuller shape the shared project list screen
 *  needs — client, current stage, latest metrics — instead of the DPR flow's bare shape. */
export function useEngineerProjectSummaries() {
  const { user } = useAuth();
  const projectIds = Array.from(
    new Set(
      (user?.role ?? [])
        .filter((grant) => grant.role === "SiteEngineer" && grant.project_id)
        .map((grant) => grant.project_id as string),
    ),
  );

  const results = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ["project", projectId],
      queryFn: async () => unwrap(await api.get<ProjectDetailResponse>(`/projects/${projectId}`)),
      staleTime: 30_000,
    })),
  });

  // Same aggregate (schedule + custom) milestones the PM-style Milestones tab uses, fetched
  // index-aligned with `results` above so the two zip back together by project below.
  const milestoneResults = useQueries({
    queries: projectIds.map((projectId) => ({
      queryKey: ["project", projectId, "milestones", true],
      queryFn: async () =>
        unwrap(
          await api.get<{ milestones: Milestone[] }>(
            `/projects/${projectId}/milestones?limit=50&aggregate=true`,
          ),
        ).milestones,
      staleTime: 30_000,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  const projects: EngineerProjectSummary[] = projectIds
    .map((_, i): EngineerProjectSummary | null => {
      const detail = results[i]?.data;
      if (!detail) return null;
      const { project, stages, metrics } = detail;
      const latest = metrics[metrics.length - 1];
      const activeStage = stages.find((s) => s.state === "active");
      // Mirrors nextMilestoneByProjectId (database.ts): not yet reached, soonest due date.
      const nextMilestone = (milestoneResults[i]?.data ?? [])
        .filter((m) => !m.actual_date)
        .sort(
          (a, b) =>
            new Date(a.forecast_date ?? a.planned_date).getTime() -
            new Date(b.forecast_date ?? b.planned_date).getTime(),
        )[0];
      return {
        project_id: project.project_id,
        name: project.name,
        client_name: project.client_name,
        current_stage_name: activeStage?.stage_name ?? null,
        status: project.status,
        spi: latest?.spi ?? null,
        completed_pct: latest?.actual_pct ?? null,
        planned_pct: latest?.planned_pct ?? null,
        next_milestone: nextMilestone?.title ?? null,
      };
    })
    .filter((p): p is EngineerProjectSummary => p !== null);

  return { data: projects, isLoading };
}

export function useWeatherCategories() {
  return useQuery({
    queryKey: ["weather-categories"],
    queryFn: async () =>
      unwrap(await api.get<{ categories: WeatherCategory[] }>("/weather-categories")).categories,
    staleTime: 5 * 60_000,
  });
}

export function usePersonnelRoles() {
  return useQuery({
    queryKey: ["personnel-roles"],
    queryFn: async () =>
      unwrap(await api.get<{ roles: PersonnelRole[] }>("/personnel-roles")).roles,
    staleTime: 5 * 60_000,
  });
}

export function useProjectContractors(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "contractors"],
    queryFn: async () =>
      unwrap(
        await api.get<{ contractors: ProjectContractorOption[] }>(
          `/projects/${projectId}/contractors`,
        ),
      ).contractors,
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useDprPrefill(projectId: string) {
  return useQuery({
    queryKey: ["project", projectId, "dpr", "prefill"],
    queryFn: async () =>
      unwrap(
        await api.get<{
          prefill: {
            site_location: string;
            contract_no: string | null;
            personnel_groups: Array<{
              project_contractor_id: string;
              contractor_name: string;
              party_type: "contractor" | "subcontractor";
              sort_order: number;
            }>;
          } | null;
        }>(`/projects/${projectId}/dpr/prefill`),
      ).prefill,
    enabled: !!projectId,
    staleTime: 30_000,
  });
}

export function useEngineerWeekDprs(projectId: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["project", projectId, "dprs", "range", fromDate, toDate],
    queryFn: async () =>
      unwrap(
        await api.get<{ dprs: DprSummary[] }>(
          `/projects/${projectId}/dpr?from_date=${fromDate}&to_date=${toDate}&limit=100`,
        ),
      ).dprs,
    enabled: !!projectId,
    staleTime: 10_000,
  });
}

function toCreateBody(draft: DprDraftInput) {
  return {
    report_date: draft.report_date,
    site_location: draft.site_location,
    contract_no: draft.contract_no,
    weather_category_id: draft.weather_category_id,
    temp_min_c: draft.temp_min_c,
    temp_max_c: draft.temp_max_c,
    humidity_pct: draft.humidity_pct,
    wind: draft.wind,
    effects_text: draft.effects_text,
    effects_severity: draft.effects_severity,
    equipment_text: draft.equipment_text,
    visitors_text: draft.visitors_text,
    delays_text: draft.delays_text,
    incidents_text: draft.incidents_text,
    other_notes_text: draft.other_notes_text,
    work_items: draft.work_items,
    activity_progress: draft.activity_progress.map((a) => ({
      dpr_activity_progress_id: a.dpr_activity_progress_id,
      source: a.source,
      task_id: a.task_id,
      free_text: a.free_text,
      today_pct: a.today_pct,
      total_pct: a.total_pct,
    })),
    personnel_groups: draft.personnel_groups.map((g) => ({
      personnel_group_id: g.personnel_group_id,
      project_contractor_id: g.project_contractor_id,
      total_headcount: g.total_headcount,
      role_counts: g.role_counts,
    })),
    photos: draft.photos.map((p) => ({
      photo_id: p.photo_id,
      file_id: p.file_id,
      caption: p.caption,
    })),
  };
}

/** AC-DPR-04: one DPR per project per date, drafts included — so a wizard opened for a date
 *  that already has one (draft or submitted) must resume it, never try to create a second. */
export async function findDprForDate(projectId: string, reportDate: string): Promise<DprSummary | null> {
  const { dprs } = unwrap(
    await api.get<{ dprs: DprSummary[] }>(
      `/projects/${projectId}/dpr?from_date=${reportDate}&to_date=${reportDate}&limit=1`,
    ),
  );
  return dprs[0] ?? null;
}

export async function getDprDetail(projectId: string, dprId: string): Promise<DprDetail> {
  return unwrap(await api.get<{ dpr: DprDetail }>(`/projects/${projectId}/dpr/${dprId}`)).dpr;
}

export async function createDraftDpr(projectId: string, draft: DprDraftInput) {
  return unwrap(
    await api.post<{ dpr: DprDetail }>(`/projects/${projectId}/dpr`, toCreateBody(draft), {
      silent: true,
    }),
  ).dpr;
}

export async function patchDpr(projectId: string, dprId: string, draft: DprDraftInput) {
  return unwrap(
    await api.patch<{ dpr: DprDetail }>(
      `/projects/${projectId}/dpr/${dprId}`,
      toCreateBody(draft),
      { silent: true },
    ),
  ).dpr;
}

export async function submitDpr(projectId: string, dprId: string) {
  return unwrap(
    await api.post<{ dpr: DprDetail }>(
      `/projects/${projectId}/dpr/${dprId}/submit`,
      {},
      { silent: true },
    ),
  ).dpr;
}

export async function uploadDprPhoto(
  projectId: string,
  input: { file: string; filename: string; caption?: string | null },
) {
  return unwrap(
    await api.post<{ file_id: string; url: string }>(
      `/projects/${projectId}/dpr/photos/upload`,
      input,
    ),
  );
}

export async function createProjectContractor(
  projectId: string,
  input: { contractor_name: string; party_type?: "contractor" | "subcontractor" },
) {
  return unwrap(
    await api.post<{ contractor: ProjectContractorOption }>(
      `/projects/${projectId}/contractors`,
      input,
    ),
  ).contractor;
}

export function useDprInvalidate(projectId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "dpr"] });
    queryClient.invalidateQueries({ queryKey: ["project", projectId, "dprs"] });
  };
}
