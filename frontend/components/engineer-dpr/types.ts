import type { DprDetail, DprEffectsSeverity, DprProgressSource } from "@/components/weekly-submission/types";

/**
 * "Today" as a YYYY-MM-DD string in the given IANA timezone — mirrors the backend's
 * `getTodayInTimezone`. Never use `new Date().toISOString().slice(0, 10)` for a DPR report
 * date: that's UTC, which can land on the wrong calendar day versus the project's own
 * timezone (e.g. Africa/Nairobi is UTC+3) and trips the "DPR already exists" conflict when
 * client and server disagree on what day it is.
 */
export function todayInTimezone(timezone: string | null | undefined): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone || "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export interface WeatherCategory {
  weather_category_id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface PersonnelRole {
  personnel_role_id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface ProjectContractorOption {
  project_contractor_id: string;
  project_id: string;
  contractor_id: string;
  contractor_name: string;
  party_type: "contractor" | "subcontractor";
  is_active: boolean;
}

export interface EngineerProject {
  project_id: string;
  name: string;
  current_stage_name: string | null;
  status: string;
}

/** Local draft shape for a row being edited in the Work & progress step. */
export interface DraftWorkItem {
  work_item_id?: string;
  work_area: string;
  work_carried_out: string;
}

export interface DraftActivityProgress {
  dpr_activity_progress_id?: string;
  source: DprProgressSource;
  task_id: string | null;
  task_name?: string | null;
  free_text: string | null;
  today_pct: number;
  total_pct: number;
  /** Schedule tasks only: the task's completion as of when it was picked — the "current" figure
   *  shown next to the new-total input, so today_pct can be derived instead of typed. */
  current_pct?: number;
}

export interface DraftRoleCount {
  personnel_role_id: number;
  headcount: number;
}

export interface DraftPersonnelGroup {
  personnel_group_id?: string;
  project_contractor_id: string;
  contractor_name: string;
  total_headcount: number;
  role_counts: DraftRoleCount[];
}

export interface DraftPhoto {
  photo_id?: string;
  file_id: string;
  url: string;
  caption: string | null;
}

/** The full create/patch body for a DPR draft, matching createDprSchema field-for-field. */
export interface DprDraftInput {
  report_date: string;
  site_location: string;
  contract_no: string | null;
  weather_category_id: number | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  humidity_pct: number | null;
  wind: string | null;
  effects_text: string | null;
  effects_severity: DprEffectsSeverity;
  work_items: DraftWorkItem[];
  activity_progress: DraftActivityProgress[];
  personnel_groups: DraftPersonnelGroup[];
  equipment_text: string | null;
  visitors_text: string | null;
  delays_text: string | null;
  incidents_text: string | null;
  other_notes_text: string | null;
  photos: DraftPhoto[];
}

export function emptyDprDraft(reportDate: string, siteLocation = ""): DprDraftInput {
  return {
    report_date: reportDate,
    site_location: siteLocation,
    contract_no: null,
    weather_category_id: null,
    temp_min_c: null,
    temp_max_c: null,
    humidity_pct: null,
    wind: null,
    effects_text: null,
    effects_severity: "none",
    work_items: [],
    activity_progress: [],
    personnel_groups: [],
    equipment_text: null,
    visitors_text: null,
    delays_text: null,
    incidents_text: null,
    other_notes_text: null,
    photos: [],
  };
}

/** Resuming an existing (unsubmitted) DPR: the wizard's draft shape is a subset of the full
 *  server detail, so map it back down instead of starting from emptyDprDraft and losing it. */
export function detailToDraftInput(detail: DprDetail): DprDraftInput {
  return {
    report_date: detail.report_date,
    site_location: detail.site_location,
    contract_no: detail.contract_no,
    weather_category_id: detail.weather_category_id,
    temp_min_c: detail.temp_min_c,
    temp_max_c: detail.temp_max_c,
    humidity_pct: detail.humidity_pct,
    wind: detail.wind,
    effects_text: detail.effects_text,
    effects_severity: detail.effects_severity,
    work_items: detail.work_items.map((w) => ({
      work_item_id: w.work_item_id,
      work_area: w.work_area,
      work_carried_out: w.work_carried_out,
    })),
    activity_progress: detail.activity_progress.map((a) => ({
      dpr_activity_progress_id: a.dpr_activity_progress_id,
      source: a.source,
      task_id: a.task_id,
      task_name: a.task_name,
      free_text: a.free_text,
      today_pct: a.today_pct,
      total_pct: a.total_pct,
      // today_pct was saved as total_pct - current_pct at add-time, so this reconstructs it.
      current_pct: a.source === "schedule_task" ? a.total_pct - a.today_pct : undefined,
    })),
    personnel_groups: detail.personnel_groups.map((g) => ({
      personnel_group_id: g.personnel_group_id,
      project_contractor_id: g.project_contractor_id,
      contractor_name: g.contractor_name,
      total_headcount: g.total_headcount,
      role_counts: g.role_counts.map((r) => ({
        personnel_role_id: r.personnel_role_id,
        headcount: r.headcount,
      })),
    })),
    equipment_text: detail.equipment_text,
    visitors_text: detail.visitors_text,
    delays_text: detail.delays_text,
    incidents_text: detail.incidents_text,
    other_notes_text: detail.other_notes_text,
    photos: detail.photos.map((p) => ({
      photo_id: p.photo_id,
      file_id: p.file_id,
      url: p.url,
      caption: p.caption,
    })),
  };
}

export interface WizardStepDef {
  key: string;
  label: string;
}

export const WIZARD_STEPS: WizardStepDef[] = [
  { key: "site-conditions", label: "Site & conditions" },
  { key: "effects", label: "Effects on work" },
  { key: "work-progress", label: "Work & progress" },
  { key: "personnel", label: "Personnel" },
  { key: "equipment-notes", label: "Equipment & notes" },
  { key: "photos", label: "Photos" },
];
