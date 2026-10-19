import type { DprEffectsSeverity, DprProgressSource } from "@/components/weekly-submission/types";

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
