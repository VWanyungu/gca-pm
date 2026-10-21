export type ProjectStatus = "active" | "on_hold" | "complete" | "cancelled";

export interface ProjectDetail {
  project_id: string;
  project_code: string;
  name: string;
  program_id: number;
  client_name: string | null;
  site_location: string | null;
  site_lat: number | null;
  site_lng: number | null;
  expected_start_date: string | null;
  expected_end_date: string | null;
  status: ProjectStatus;
  created_at: string;
}

export interface StageRow {
  project_id: string;
  stage_no: number;
  stage_name: string;
  phase_id: number;
  in_scope: boolean;
  state: "not_started" | "active" | "inactive" | "complete";
}

export interface MetricRow {
  as_of_date: string;
  planned_pct: number;
  actual_pct: number;
  spi: number | null;
  rag: "green" | "amber" | "red" | null;
  baseline_finish: string | null;
  forecast_finish: string | null;
}

export interface ProjectDetailResponse {
  project: ProjectDetail;
  stages: StageRow[];
  metrics: MetricRow[];
}

export interface TeamMember {
  attribute_id: string;
  user_id: string;
  role: "PM" | "Planner" | "SiteEngineer" | "ExCo" | "Admin" | "ProjectCreator";
  scope_type: string;
  project_id: string | null;
  granted_at: string;
  first_name: string;
  last_name: string;
  email: string;
}

/**
 * The team list is a list of role grants, so someone holding two roles on a project — a PM who
 * is also the Planner, say — appears twice. Anywhere a person should be listed once (an owner
 * picker, an avatar row) needs this; anywhere the grant itself is the subject does not.
 */
export function uniquePeople(team: TeamMember[]): TeamMember[] {
  const seen = new Set<string>();
  return team.filter((m) => (seen.has(m.user_id) ? false : (seen.add(m.user_id), true)));
}

export interface ClientContact {
  contact_id: string;
  project_id: string;
  name: string;
  email: string;
  title: string | null;
  receives_reports: boolean;
}

export interface StageActivity {
  activity_id: string;
  stage_no: number;
  title: string;
  description?: string | null;
  status: "open" | "in_progress" | "done" | "cancelled";
  due_date: string | null;
  owner_id: string | null;
  completed_at?: string | null;
  created_by?: string;
  created_at?: string;
}

export interface StageActivityAttachment {
  attachment_id: string;
  activity_id: string;
  caption: string | null;
  sort_order: number;
  uploaded_at: string;
}

export interface StageDetail {
  project_id: string;
  stage_no: number;
  stage_name: string;
  phase_id: number;
  in_scope: boolean;
  state: "not_started" | "active" | "inactive" | "complete";
  added_to_scope_at: string;
  last_changed_at: string;
}

export interface ChecklistItem {
  item_id: string;
  project_id: string;
  stage_no: number;
  text: string;
  sort_order: number;
  is_checked: boolean;
}

export interface StageRisk {
  risk_id: string;
  title: string;
  status: "open" | "mitigated" | "closed" | "dismissed" | "auto_resolved";
  kind: "risk" | "issue";
  impact: number;
  source: "manual" | "overdue_task";
}

export interface Milestone {
  milestone_id: string;
  title: string;
  planned_date: string;
  forecast_date: string | null;
  actual_date: string | null;
  stage_no: number | null;
  slippage_days?: number | null;
}

export interface EscalationRow {
  escalation_id: string;
  status: "open" | "acknowledged" | "resolved" | "voided";
  created_at: string;
  escalation_reason?: string | null;
  week_start?: string | null;
}

export function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

export const STAGE_SHORT_NAME: Record<number, string> = {
  1: "Concept",
  2: "Feasibility",
  3: "Structuring",
  4: "PMC",
  5: "Design",
  6: "Procurement",
  7: "Construction",
  8: "Comm...",
  9: "O&M",
  10: "Decomm...",
};
