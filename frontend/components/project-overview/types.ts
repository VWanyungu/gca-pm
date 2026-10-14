export type ProjectStatus = "active" | "on_hold" | "complete" | "cancelled";

export interface ProjectDetail {
  project_id: string;
  project_code: string;
  name: string;
  program_id: number;
  client_name: string | null;
  site_location: string | null;
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
  status: "open" | "in_progress" | "done" | "cancelled";
  due_date: string | null;
  owner_id: string | null;
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
