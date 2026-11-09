export type QStashEventType =
  | 'dpr.sync'
  | 'weekly_report.sync'
  | 'risk.sync'
  | 'change_request.sync'
  | 'project.sync'
  | 'metrics.sync'
  | 'stage.sync'
  | 'team.sync'
  | 'milestone.sync'
  | 'client_feedback.sync';

export interface QStashEventEnvelope<T = any> {
  event_id: string;
  event_type: QStashEventType;
  timestamp?: string;
  source_system?: string;
  project: {
    project_code?: string;
    project_id?: string;
  };
  data: T;
}

export interface DprSyncPayload {
  report_date: string; // YYYY-MM-DD
  stage_no?: number; // e.g. 7 (Construction)
  site_location?: string;
  contract_no?: string;
  weather?: {
    weather_category_id?: number;
    temp_min_c?: number;
    temp_max_c?: number;
    humidity_pct?: number;
    wind?: string;
    weather_delay_hours?: number;
  };
  general_remarks?: string;
  equipment_text?: string;
  visitors_text?: string;
  delays_text?: string;
  manpower?: Array<{
    contractor_name: string;
    total_headcount: number;
    role_breakdown?: Array<{
      role_name: string;
      count: number;
    }>;
  }>;
  activity_progress?: Array<{
    task_id?: string;
    work_item_id?: string;
    description?: string;
    today_pct?: number;
    total_pct: number;
    remarks?: string;
  }>;
  auto_submit?: boolean;
}

export interface WeeklySyncPayload {
  week_start: string; // YYYY-MM-DD (Monday)
  pm_commentary?: string;
  top_risk_id?: string;
  top_risk_text?: string;
  top_action?: string;
  active_stages?: number[];
  scope_change_text?: string;
  exco_decision_needed?: string;
  escalate?: boolean;
  escalation_reason?: string;
  planned_pct?: number;
  actual_pct?: number;
  spi?: number;
  rag?: 'green' | 'amber' | 'red';
  auto_approve?: boolean;
}

export interface RiskSyncPayload {
  external_id?: string;
  risk_id?: string;
  kind?: 'risk' | 'issue';
  title: string;
  description?: string;
  category_id?: number;
  category_code?: string;
  likelihood?: number; // 1-5
  impact?: number; // 1-5
  status?: 'open' | 'closed';
  mitigation_plan?: string;
  stage_no?: number;
  owner_id?: string;
  owner_email?: string;
}

export interface ChangeRequestSyncPayload {
  external_id?: string;
  change_id?: string;
  title: string;
  scope_description?: string;
  reason?: string;
  supporting_notes?: string;
  cost_impact?: number;
  cost_currency?: string;
  schedule_impact_days?: number;
  stage_no?: number;
  status?: 'pending' | 'noted' | 'approved' | 'rejected';
}

export interface MetricsSyncPayload {
  actual_pct: number;
  planned_pct?: number;
  spi?: number;
  rag?: 'green' | 'amber' | 'red';
  baseline_finish?: string;
  forecast_finish?: string;
  as_of_date?: string; // YYYY-MM-DD, defaults to today
}

export interface StageUpdateItem {
  stage_no: number;
  state?: 'not_started' | 'active' | 'inactive' | 'complete';
  in_scope?: boolean;
  reason?: string;
  closure_notes?: string;
}

export interface StageActivitySyncItem {
  activity_id: string;
  status: 'open' | 'in_progress' | 'done' | 'cancelled';
}

export interface StageSyncPayload {
  stages?: StageUpdateItem[];
  // Kickoff/Closure gate-activity checklist items (AC-STG-12): these stages complete
  // themselves once every activity is done, there is no direct "set state" for them.
  activities?: StageActivitySyncItem[];
}

export interface TeamMemberItem {
  user_id?: string;
  email?: string;
  is_team_lead?: boolean;
}

export interface TeamSyncPayload {
  pm_user_id?: string;
  pm_email?: string;
  site_engineer_user_id?: string;
  site_engineer_email?: string;
  planner_user_id?: string;
  planner_email?: string;
  members?: TeamMemberItem[];
}

export interface CustomMilestoneSyncItem {
  milestone_id?: string;
  title: string;
  stage_no?: number | null;
  planned_date: string;
  forecast_date?: string | null;
  actual_date?: string | null;
  notes?: string | null;
}

export interface MilestoneSyncPayload {
  milestones: CustomMilestoneSyncItem[];
}

export interface ClientFeedbackResponseItem {
  rating_overall: number;
  rating_quality: number;
  rating_updates: number;
  rating_schedule: number;
  comment?: string | null;
}

export interface ClientFeedbackSyncItem {
  // An existing GCA request to attach a response to. Omit to create a new one.
  request_id?: string;
  // Needed only when request_id is omitted: identifies which client contact the
  // request is for, either GCA's own id or the email synced via client_contacts.
  contact_id?: string;
  contact_email?: string;
  about?: string;
  expires_in_days?: number;
  // The sister system already collected this answer through its own channel and
  // is pushing it in; omit to just send a request and let GCA's own link flow
  // collect the response later.
  response?: ClientFeedbackResponseItem;
}

export interface ClientFeedbackSyncPayload {
  feedback: ClientFeedbackSyncItem[];
}

export interface ClientContactSyncItem {
  contact_id?: string;
  name: string;
  role_title?: string;
  email: string;
  phone?: string;
  is_primary?: boolean;
  receives_reports?: boolean;
}

export interface ContractorSyncItem {
  contractor_id?: string;
  contractor_name?: string;
  party_type?: 'contractor' | 'subcontractor';
  is_active?: boolean;
}

export interface ProjectSyncPayload {
  // Core Metadata & Attributes
  name?: string;
  program_id?: number;
  client_name?: string;
  site_location?: string;
  site_lat?: number;
  site_lng?: number;
  country?: string;
  timezone?: string;
  is_civil?: boolean;
  is_mechanical?: boolean;
  is_electrical?: boolean;
  expected_start_date?: string;
  expected_end_date?: string;
  estimated_value?: number;
  currency?: string;
  holiday_calendar_id?: number;
  dpr_expected_weekdays?: number[];
  banner_photos?: string[];

  // Status & Transitions (active, on_hold, complete, cancelled)
  status?: 'active' | 'on_hold' | 'complete' | 'cancelled';
  status_change_reason?: string;

  // Actual Percentage Done & Progress Metrics
  actual_pct?: number;
  planned_pct?: number;
  spi?: number;
  rag?: 'green' | 'amber' | 'red';
  baseline_finish?: string;
  forecast_finish?: string;
  as_of_date?: string;

  // PDM Stages
  stages?: StageUpdateItem[];

  // Kickoff/Closure gate-activity checklist items (see StageSyncPayload.activities)
  activities?: StageActivitySyncItem[];

  // Team & Roles
  team?: TeamSyncPayload;

  // Contractors & Contacts
  contractors?: ContractorSyncItem[];
  client_contacts?: ClientContactSyncItem[];

  // Milestones
  milestones?: CustomMilestoneSyncItem[];

  // Client feedback requests/responses (see ClientFeedbackSyncPayload)
  feedback?: ClientFeedbackSyncItem[];
}
