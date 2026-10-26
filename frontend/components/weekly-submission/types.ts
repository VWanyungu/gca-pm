export type WeeklySubmissionStatus = "draft" | "approved" | "superseded";
export type SubmitTab = "week" | "register";
export type AddressedRiskMethod = "top_risk" | "top_action" | "commentary" | "dismissed";
export type ProjectRag = "green" | "amber" | "red";

export interface SubmissionAddressedRisk {
  submission_id: string;
  risk_id: string;
  project_id: string;
  method: AddressedRiskMethod;
  added_by: string;
  added_at: string;
  risk_code?: string;
  risk_title?: string;
  risk_status?: string;
  dismissal_reason?: string | null;
}

export interface EscalationSummary {
  escalation_id: string;
  status: "open" | "acknowledged" | "resolved" | "voided";
  created_at: string;
}

export interface WeeklySubmission {
  submission_id: string;
  project_id: string;
  week_start: string;
  revision_no: number;
  supersedes_submission_id: string | null;
  status: WeeklySubmissionStatus;
  schedule_version_id: string | null;
  planned_pct: number | null;
  actual_pct: number | null;
  spi: number | null;
  rag: ProjectRag | null;
  active_stages: number[];
  scope_change_text: string;
  top_risk_id: string | null;
  top_risk_text: string | null;
  top_action: string | null;
  pm_commentary: string | null;
  exco_decision_needed: string | null;
  escalate: boolean;
  escalation_reason: string | null;
  is_late: boolean | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
  project_name?: string;
  project_code?: string;
  creator_name?: string;
  approver_name?: string;
  addressed_risks?: SubmissionAddressedRisk[];
  escalation?: EscalationSummary | null;
}

export interface SubmissionPhoto {
  photo_id: string;
  dpr_id: string;
  file_id: string;
  caption: string | null;
  taken_at: string | null;
  report_date: string;
  site_location: string;
  selected: boolean;
  url: string;
}

export interface DprSummary {
  dpr_id: string;
  dpr_ref: string | null;
  report_date: string;
  site_location: string;
  status: "draft" | "submitted";
  author_id: string;
  submitted_at: string | null;
  is_late: boolean | null;
}

export interface DprAmendment {
  amendment_id: string;
  dpr_id: string;
  amendment_no: number;
  reason: string;
  proposed_document: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "withdrawn";
  requested_by: string;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  applied_at: string | null;
  writeback_outcome: "applied" | "skipped_stale_schedule" | "no_change" | null;
  dpr_ref?: string | null;
  report_date?: string;
  site_location?: string;
  requester_name?: string;
}

export type DprEffectsSeverity = "none" | "minor" | "significant" | "stoppage";
export type DprProgressSource = "schedule_task" | "free_text";

export interface DprWorkItem {
  work_item_id: string;
  dpr_id: string;
  sort_order: number;
  work_area: string;
  work_carried_out: string;
}

export interface DprActivityProgress {
  dpr_activity_progress_id: string;
  dpr_id: string;
  sort_order: number;
  source: DprProgressSource;
  task_id: string | null;
  free_text: string | null;
  today_pct: number;
  total_pct: number;
  task_name?: string | null;
}

export interface DprPersonnelRoleCount {
  personnel_group_id: string;
  personnel_role_id: number;
  headcount: number;
  role_name: string;
}

export interface DprPersonnelGroup {
  personnel_group_id: string;
  dpr_id: string;
  project_contractor_id: string;
  sort_order: number;
  total_headcount: number;
  role_counts: DprPersonnelRoleCount[];
  contractor_name: string;
  party_type: "contractor" | "subcontractor";
}

export interface DprPhoto {
  photo_id: string;
  dpr_id: string;
  file_id: string;
  caption: string | null;
  sort_order: number;
  taken_at: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  uploaded_by: string;
  uploaded_at: string;
  url: string;
}

export interface DprDetail {
  dpr_id: string;
  dpr_ref: string | null;
  project_id: string;
  stage_no: number;
  report_date: string;
  site_location: string;
  contract_no: string | null;
  weather_category_id: number | null;
  weather_category_name: string | null;
  temp_min_c: number | null;
  temp_max_c: number | null;
  humidity_pct: number | null;
  wind: string | null;
  effects_text: string | null;
  effects_severity: DprEffectsSeverity;
  equipment_text: string | null;
  visitors_text: string | null;
  delays_text: string | null;
  incidents_text: string | null;
  materials_rejected_text: string | null;
  other_notes_text: string | null;
  status: "draft" | "submitted";
  author_id: string;
  author_name: string;
  submitted_by: string | null;
  submitted_by_name: string | null;
  submitted_at: string | null;
  is_late: boolean | null;
  work_items: DprWorkItem[];
  activity_progress: DprActivityProgress[];
  personnel_groups: DprPersonnelGroup[];
  photos: DprPhoto[];
}

export const EFFECTS_SEVERITY_LABEL: Record<DprEffectsSeverity, string> = {
  none: "No effect",
  minor: "Minor",
  significant: "Significant",
  stoppage: "Work stopped",
};

/** Monday (ISO yyyy-mm-dd) of the week containing `date`. */
export function mondayOf(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7; // Sunday -> 7
  if (day !== 1) d.setUTCDate(d.getUTCDate() - (day - 1));
  return d.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatWeekPeriod(weekStart: string): string {
  const start = new Date(`${weekStart.slice(0, 10)}T00:00:00Z`);
  const end = new Date(`${addDays(weekStart, 6)}T00:00:00Z`);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startLabel = start.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
  const endLabel = end.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return sameMonth ? `${startLabel} to ${endLabel}` : `${startLabel.padStart(0)} ${endLabel}`;
}

/** ISO 8601 week number, which is what `extract(week from ...)` gives on the database side
 *  and what the WPR document code has to match. A week belongs to the year holding its
 *  Thursday, so a January week can be week 52/53 of the year before. */
export function weekNumber(weekStart: string): number {
  const d = new Date(`${weekStart.slice(0, 10)}T00:00:00Z`);
  const isoDay = d.getUTCDay() || 7; // Sunday -> 7
  d.setUTCDate(d.getUTCDate() + 4 - isoDay); // this week's Thursday
  const firstJan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - firstJan.getTime()) / 86_400_000 + 1) / 7);
}

export const ADDRESSED_METHOD_LABEL: Record<AddressedRiskMethod, string> = {
  top_risk: "Main top risk",
  top_action: "Top action",
  commentary: "Referenced in commentary",
  dismissed: "Dismissed",
};
