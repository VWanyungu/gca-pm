export type WeeklySubmissionStatus = "draft" | "approved" | "superseded";
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
  return sameMonth ? `${startLabel}–${endLabel}` : `${startLabel.padStart(0)} ${endLabel}`;
}

export function weekNumber(weekStart: string): number {
  const d = new Date(`${weekStart.slice(0, 10)}T00:00:00Z`);
  const firstJan = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((d.getTime() - firstJan.getTime()) / 86_400_000);
  return Math.ceil((days + firstJan.getUTCDay() + 1) / 7);
}

export const ADDRESSED_METHOD_LABEL: Record<AddressedRiskMethod, string> = {
  top_risk: "Main top risk",
  top_action: "Top action",
  commentary: "Referenced in commentary",
  dismissed: "Dismissed",
};
