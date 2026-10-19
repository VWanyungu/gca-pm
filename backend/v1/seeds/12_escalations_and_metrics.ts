import type { Knex } from 'knex';

// Mirrors of ids from earlier seeds (inlined — knex ESM seeds don't cross-import cleanly here).
const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  EXCO: '10000000-0000-0000-0000-000000000003',
  PM: '10000000-0000-0000-0000-000000000004',
  PM_2: '10000000-0000-0000-0000-000000000005',
  PLANNER: '10000000-0000-0000-0000-000000000006',
};

const PROJECT_IDS = {
  PROJECT_1: '20000000-0000-0000-0000-000000000001',
  PROJECT_2: '20000000-0000-0000-0000-000000000002',
  PROJECT_3: '20000000-0000-0000-0000-000000000003',
};

// Project 1 already has an applied schedule from 09_schedule_files.ts — reused here.
const PROJECT_1_SCHEDULE_VERSION_ID = '52000000-0000-0000-0000-000000000001';

// New schedule baselines for projects 2 & 3 (neither had one before this seed).
const FILE_IDS = {
  PROJECT_2_SCHEDULE: '64000000-0000-0000-0000-000000000001',
  PROJECT_3_SCHEDULE: '64000000-0000-0000-0000-000000000002',
};
const SCHEDULE_VERSION_IDS = {
  PROJECT_2: '63000000-0000-0000-0000-000000000001',
  PROJECT_3: '63000000-0000-0000-0000-000000000002',
};

interface MetricRow {
  project_id: string;
  as_of_date: string;
  schedule_version_id: string;
  planned_pct: number;
  actual_pct: number;
  spi: number;
  rag: 'green' | 'amber' | 'red';
  baseline_finish: string;
  forecast_finish: string;
}

// RAG thresholds per AC-SCH-33: >= 0.95 green, >= 0.80 amber, else red.
const PROJECT_METRICS: MetricRow[] = [
  // Project 1 — Mombasa Port LPG Bulk Storage Terminal (stage 7 Construction active,
  // consistently behind schedule — matches the existing 2026-10-12 snapshot/escalation).
  { project_id: PROJECT_IDS.PROJECT_1, as_of_date: '2026-08-10', schedule_version_id: PROJECT_1_SCHEDULE_VERSION_ID, planned_pct: 78, actual_pct: 10, spi: 0.13, rag: 'red', baseline_finish: '2026-11-30', forecast_finish: '2026-12-05' },
  { project_id: PROJECT_IDS.PROJECT_1, as_of_date: '2026-08-24', schedule_version_id: PROJECT_1_SCHEDULE_VERSION_ID, planned_pct: 85, actual_pct: 14, spi: 0.16, rag: 'red', baseline_finish: '2026-11-30', forecast_finish: '2026-12-10' },
  { project_id: PROJECT_IDS.PROJECT_1, as_of_date: '2026-09-07', schedule_version_id: PROJECT_1_SCHEDULE_VERSION_ID, planned_pct: 90, actual_pct: 18, spi: 0.20, rag: 'red', baseline_finish: '2026-11-30', forecast_finish: '2026-12-12' },
  { project_id: PROJECT_IDS.PROJECT_1, as_of_date: '2026-09-21', schedule_version_id: PROJECT_1_SCHEDULE_VERSION_ID, planned_pct: 95, actual_pct: 24, spi: 0.25, rag: 'red', baseline_finish: '2026-11-30', forecast_finish: '2026-12-15' },
  { project_id: PROJECT_IDS.PROJECT_1, as_of_date: '2026-10-05', schedule_version_id: PROJECT_1_SCHEDULE_VERSION_ID, planned_pct: 98, actual_pct: 30, spi: 0.31, rag: 'red', baseline_finish: '2026-11-30', forecast_finish: '2026-12-18' },
  // 2026-10-12 snapshot already seeded in 09_schedule_files.ts (planned 100 / actual 35 / spi 0.35 / red).

  // Project 2 — Nairobi Industrial Area Gas Reticulation Loop (stage 4 PMC active,
  // generally on track with one dip).
  { project_id: PROJECT_IDS.PROJECT_2, as_of_date: '2026-08-03', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2, planned_pct: 15, actual_pct: 12, spi: 0.80, rag: 'amber', baseline_finish: '2026-12-15', forecast_finish: '2026-12-18' },
  { project_id: PROJECT_IDS.PROJECT_2, as_of_date: '2026-08-31', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2, planned_pct: 25, actual_pct: 20, spi: 0.80, rag: 'amber', baseline_finish: '2026-12-15', forecast_finish: '2026-12-20' },
  { project_id: PROJECT_IDS.PROJECT_2, as_of_date: '2026-09-14', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2, planned_pct: 35, actual_pct: 30, spi: 0.86, rag: 'amber', baseline_finish: '2026-12-15', forecast_finish: '2026-12-22' },
  { project_id: PROJECT_IDS.PROJECT_2, as_of_date: '2026-09-28', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2, planned_pct: 42, actual_pct: 33, spi: 0.79, rag: 'red', baseline_finish: '2026-12-15', forecast_finish: '2026-12-25' },
  { project_id: PROJECT_IDS.PROJECT_2, as_of_date: '2026-10-05', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2, planned_pct: 47, actual_pct: 40, spi: 0.85, rag: 'amber', baseline_finish: '2026-12-15', forecast_finish: '2026-12-23' },
  { project_id: PROJECT_IDS.PROJECT_2, as_of_date: '2026-10-12', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2, planned_pct: 52, actual_pct: 46, spi: 0.88, rag: 'amber', baseline_finish: '2026-12-15', forecast_finish: '2026-12-20' },

  // Project 3 — Eldoret-Kisumu CNG Daughter Station (stage 3 Structuring & Financing
  // active — barely started, recovering from a slow start).
  { project_id: PROJECT_IDS.PROJECT_3, as_of_date: '2026-08-17', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3, planned_pct: 8, actual_pct: 5, spi: 0.63, rag: 'red', baseline_finish: '2027-01-31', forecast_finish: '2027-02-10' },
  { project_id: PROJECT_IDS.PROJECT_3, as_of_date: '2026-09-07', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3, planned_pct: 14, actual_pct: 9, spi: 0.64, rag: 'red', baseline_finish: '2027-01-31', forecast_finish: '2027-02-12' },
  { project_id: PROJECT_IDS.PROJECT_3, as_of_date: '2026-09-28', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3, planned_pct: 20, actual_pct: 16, spi: 0.80, rag: 'amber', baseline_finish: '2027-01-31', forecast_finish: '2027-02-05' },
  { project_id: PROJECT_IDS.PROJECT_3, as_of_date: '2026-10-12', schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3, planned_pct: 25, actual_pct: 20, spi: 0.80, rag: 'amber', baseline_finish: '2027-01-31', forecast_finish: '2027-02-01' },
];

interface SubmissionSeed {
  submission_id: string;
  project_id: string;
  week_start: string;
  active_stages: number[];
  schedule_version_id: string;
  planned_pct: number;
  actual_pct: number;
  spi: number;
  rag: 'green' | 'amber' | 'red';
  top_risk_text: string;
  top_action: string;
  pm_commentary: string;
  escalation_reason: string;
  created_by: string;
  approved_at: string;
}

// Weekly submissions that back each escalation (AC-ESC-01: escalations are only
// created by weekly approval, with escalate = true).
const ESCALATION_SUBMISSIONS: SubmissionSeed[] = [
  // Project 1
  {
    submission_id: '60000000-0000-0000-0000-000000000001',
    project_id: PROJECT_IDS.PROJECT_1,
    week_start: '2026-09-07',
    active_stages: [7],
    schedule_version_id: PROJECT_1_SCHEDULE_VERSION_ID,
    planned_pct: 90, actual_pct: 18, spi: 0.20, rag: 'red',
    top_risk_text: 'Late delivery of LPG tank valves.',
    top_action: 'Confirm delivery dates and maintain an alternate supplier.',
    pm_commentary: 'Foundation works continuing; procurement slippage is widening the schedule gap.',
    escalation_reason: 'Construction progress is well behind the baseline (SPI 0.20); executive visibility requested.',
    created_by: USER_IDS.PM,
    approved_at: '2026-09-08T08:00:00Z',
  },
  {
    submission_id: '60000000-0000-0000-0000-000000000002',
    project_id: PROJECT_IDS.PROJECT_1,
    week_start: '2026-09-21',
    active_stages: [7],
    schedule_version_id: PROJECT_1_SCHEDULE_VERSION_ID,
    planned_pct: 95, actual_pct: 24, spi: 0.25, rag: 'red',
    top_risk_text: 'Valve delivery remains delayed; civil works crew under-resourced.',
    top_action: 'Mobilise additional civil crew and escalate valve order with supplier.',
    pm_commentary: 'Marginal recovery this week but still materially behind the construction baseline.',
    escalation_reason: 'Second consecutive red status; schedule recovery plan requested from ExCo.',
    created_by: USER_IDS.PM,
    approved_at: '2026-09-22T08:00:00Z',
  },
  // Project 2
  {
    submission_id: '60000000-0000-0000-0000-000000000003',
    project_id: PROJECT_IDS.PROJECT_2,
    week_start: '2026-09-14',
    active_stages: [4],
    schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2,
    planned_pct: 35, actual_pct: 30, spi: 0.86, rag: 'amber',
    top_risk_text: 'Way-leave approvals for the reticulation corridor are pending with the county.',
    top_action: 'Follow up with county liaison and expedite remaining way-leave approvals.',
    pm_commentary: 'PMC deliverables tracking close to plan; one permitting risk being monitored.',
    escalation_reason: 'Way-leave delay could affect the design-development entry date; flagging for visibility.',
    created_by: USER_IDS.PM,
    approved_at: '2026-09-15T08:00:00Z',
  },
  {
    submission_id: '60000000-0000-0000-0000-000000000004',
    project_id: PROJECT_IDS.PROJECT_2,
    week_start: '2026-10-05',
    active_stages: [4],
    schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2,
    planned_pct: 47, actual_pct: 40, spi: 0.85, rag: 'amber',
    top_risk_text: 'Way-leave approvals outstanding for two corridor segments.',
    top_action: 'Escalate outstanding segments to the Ministry liaison.',
    pm_commentary: 'Progress steady; permitting risk persists into a second review cycle.',
    escalation_reason: 'Outstanding way-leave risk now spans two review cycles without resolution.',
    created_by: USER_IDS.PM,
    approved_at: '2026-10-06T08:00:00Z',
  },
  // Project 3
  {
    submission_id: '60000000-0000-0000-0000-000000000005',
    project_id: PROJECT_IDS.PROJECT_3,
    week_start: '2026-08-17',
    active_stages: [3],
    schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3,
    planned_pct: 8, actual_pct: 5, spi: 0.63, rag: 'red',
    top_risk_text: 'Financing structure has not been agreed with the lender consortium.',
    top_action: 'Convene a structuring workshop with TotalEnergies finance team.',
    pm_commentary: 'Structuring & financing stage is slow to start; feasibility inputs still being finalised.',
    escalation_reason: 'Stage 3 has not progressed as planned since kickoff; early executive attention requested.',
    created_by: USER_IDS.PM_2,
    approved_at: '2026-08-18T08:00:00Z',
  },
  {
    submission_id: '60000000-0000-0000-0000-000000000006',
    project_id: PROJECT_IDS.PROJECT_3,
    week_start: '2026-09-28',
    active_stages: [3],
    schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3,
    planned_pct: 20, actual_pct: 16, spi: 0.80, rag: 'amber',
    top_risk_text: 'Lender term sheet still pending sign-off.',
    top_action: 'Target term sheet sign-off within two weeks.',
    pm_commentary: 'Structuring discussions have progressed; term sheet is the main outstanding item.',
    escalation_reason: 'Term sheet delay is the last blocker before financial close; visibility requested.',
    created_by: USER_IDS.PM_2,
    approved_at: '2026-09-29T08:00:00Z',
  },
  {
    submission_id: '60000000-0000-0000-0000-000000000007',
    project_id: PROJECT_IDS.PROJECT_3,
    week_start: '2026-10-12',
    active_stages: [3],
    schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3,
    planned_pct: 25, actual_pct: 20, spi: 0.80, rag: 'amber',
    top_risk_text: 'Term sheet signed; financial close documentation now in progress.',
    top_action: 'Complete financial close documentation ahead of stage 4 planning.',
    pm_commentary: 'Recovering towards plan; financial close is on track for next month.',
    escalation_reason: 'Raising for visibility ahead of the financial close decision point.',
    created_by: USER_IDS.PM_2,
    approved_at: '2026-10-13T08:00:00Z',
  },
];

type EscStatus = 'open' | 'acknowledged' | 'resolved' | 'voided';

interface EscalationSeed {
  escalation_id: string;
  submission_id: string;
  project_id: string;
  status: EscStatus;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  responses: Array<{
    response_id: string;
    author_id: string;
    body: string;
    is_acknowledgement: boolean;
    created_at: string;
  }>;
}

const ESCALATIONS: EscalationSeed[] = [
  // Project 1: resolved, acknowledged, open (the open one is the pre-existing
  // escalation_id 54000000-0000-0000-0000-000000000006 from 10_reporting_workflows.ts).
  {
    escalation_id: '61000000-0000-0000-0000-000000000001',
    submission_id: '60000000-0000-0000-0000-000000000001',
    project_id: PROJECT_IDS.PROJECT_1,
    status: 'resolved',
    acknowledged_by: USER_IDS.EXCO, acknowledged_at: '2026-09-08T09:00:00Z',
    resolved_by: USER_IDS.EXCO, resolved_at: '2026-09-10T10:00:00Z',
    responses: [
      { response_id: '62000000-0000-0000-0000-000000000001', author_id: USER_IDS.EXCO, body: 'Acknowledged — requesting a recovery plan from the PM.', is_acknowledgement: true, created_at: '2026-09-08T09:00:00Z' },
      { response_id: '62000000-0000-0000-0000-000000000002', author_id: USER_IDS.EXCO, body: 'Recovery plan reviewed and accepted; closing this escalation.', is_acknowledgement: false, created_at: '2026-09-10T10:00:00Z' },
    ],
  },
  {
    escalation_id: '61000000-0000-0000-0000-000000000002',
    submission_id: '60000000-0000-0000-0000-000000000002',
    project_id: PROJECT_IDS.PROJECT_1,
    status: 'acknowledged',
    acknowledged_by: USER_IDS.EXCO, acknowledged_at: '2026-09-22T09:00:00Z',
    resolved_by: null, resolved_at: null,
    responses: [
      { response_id: '62000000-0000-0000-0000-000000000003', author_id: USER_IDS.EXCO, body: 'Acknowledged — monitoring the additional crew mobilisation next week.', is_acknowledgement: true, created_at: '2026-09-22T09:00:00Z' },
    ],
  },

  // Project 2: resolved, open.
  {
    escalation_id: '61000000-0000-0000-0000-000000000003',
    submission_id: '60000000-0000-0000-0000-000000000003',
    project_id: PROJECT_IDS.PROJECT_2,
    status: 'resolved',
    acknowledged_by: USER_IDS.EXCO, acknowledged_at: '2026-09-15T09:00:00Z',
    resolved_by: USER_IDS.EXCO, resolved_at: '2026-09-19T11:00:00Z',
    responses: [
      { response_id: '62000000-0000-0000-0000-000000000004', author_id: USER_IDS.EXCO, body: 'Acknowledged — will raise with the county liaison directly.', is_acknowledgement: true, created_at: '2026-09-15T09:00:00Z' },
      { response_id: '62000000-0000-0000-0000-000000000005', author_id: USER_IDS.EXCO, body: 'Way-leave approvals confirmed by the county; closing this escalation.', is_acknowledgement: false, created_at: '2026-09-19T11:00:00Z' },
    ],
  },
  {
    escalation_id: '61000000-0000-0000-0000-000000000004',
    submission_id: '60000000-0000-0000-0000-000000000004',
    project_id: PROJECT_IDS.PROJECT_2,
    status: 'open',
    acknowledged_by: null, acknowledged_at: null,
    resolved_by: null, resolved_at: null,
    responses: [],
  },

  // Project 3: acknowledged, resolved, open.
  {
    escalation_id: '61000000-0000-0000-0000-000000000005',
    submission_id: '60000000-0000-0000-0000-000000000005',
    project_id: PROJECT_IDS.PROJECT_3,
    status: 'acknowledged',
    acknowledged_by: USER_IDS.EXCO, acknowledged_at: '2026-08-18T09:00:00Z',
    resolved_by: null, resolved_at: null,
    responses: [
      { response_id: '62000000-0000-0000-0000-000000000006', author_id: USER_IDS.EXCO, body: 'Acknowledged — requesting weekly updates on the structuring workshop.', is_acknowledgement: true, created_at: '2026-08-18T09:00:00Z' },
    ],
  },
  {
    escalation_id: '61000000-0000-0000-0000-000000000006',
    submission_id: '60000000-0000-0000-0000-000000000006',
    project_id: PROJECT_IDS.PROJECT_3,
    status: 'resolved',
    acknowledged_by: USER_IDS.EXCO, acknowledged_at: '2026-09-29T09:00:00Z',
    resolved_by: USER_IDS.EXCO, resolved_at: '2026-10-03T10:00:00Z',
    responses: [
      { response_id: '62000000-0000-0000-0000-000000000007', author_id: USER_IDS.EXCO, body: 'Acknowledged — keep pushing for term sheet sign-off.', is_acknowledgement: true, created_at: '2026-09-29T09:00:00Z' },
      { response_id: '62000000-0000-0000-0000-000000000008', author_id: USER_IDS.EXCO, body: 'Term sheet signed; closing this escalation.', is_acknowledgement: false, created_at: '2026-10-03T10:00:00Z' },
    ],
  },
  {
    escalation_id: '61000000-0000-0000-0000-000000000007',
    submission_id: '60000000-0000-0000-0000-000000000007',
    project_id: PROJECT_IDS.PROJECT_3,
    status: 'open',
    acknowledged_by: null, acknowledged_at: null,
    resolved_by: null, resolved_at: null,
    responses: [],
  },
];

export async function seed(knex: Knex): Promise<void> {
  // 1. New schedule baselines for projects 2 & 3 (project 1's already exists).
  const files = [
    {
      file_id: FILE_IDS.PROJECT_2_SCHEDULE,
      project_id: PROJECT_IDS.PROJECT_2,
      purpose: 'schedule_mpp',
      variant: 'original',
      storage_key: 'seed/projects/nairobi-reticulation/schedule-baseline.mpp',
      original_filename: 'schedule-baseline.mpp',
      mime_type: 'application/vnd.ms-project',
      size_bytes: 2048,
      sha256: 'e'.repeat(64),
      status: 'available',
      uploaded_by: USER_IDS.PLANNER,
    },
    {
      file_id: FILE_IDS.PROJECT_3_SCHEDULE,
      project_id: PROJECT_IDS.PROJECT_3,
      purpose: 'schedule_mpp',
      variant: 'original',
      storage_key: 'seed/projects/eldoret-cng/schedule-baseline.mpp',
      original_filename: 'schedule-baseline.mpp',
      mime_type: 'application/vnd.ms-project',
      size_bytes: 2048,
      sha256: 'f'.repeat(64),
      status: 'available',
      uploaded_by: USER_IDS.PLANNER,
    },
  ];
  await knex('file_object')
    .insert(files)
    .onConflict('file_id')
    .merge([
      'project_id', 'purpose', 'variant', 'storage_key', 'original_filename',
      'mime_type', 'size_bytes', 'sha256', 'status', 'uploaded_by',
    ]);

  const scheduleVersions = [
    {
      schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_2,
      project_id: PROJECT_IDS.PROJECT_2,
      version_no: 1,
      status: 'applied',
      upload_kind: 'initial_baseline',
      scope_mode: 'every_task',
      status_date: '2026-08-01',
      source_file_id: FILE_IDS.PROJECT_2_SCHEDULE,
      file_sha256: 'e'.repeat(64),
      tasks_added: 1, tasks_removed: 0, tasks_modified: 0, pct_overwrites: 0, overdue_task_count: 0,
      uploaded_by: USER_IDS.PLANNER,
      uploaded_at: '2026-08-01T07:00:00Z',
      applied_at: '2026-08-01T07:05:00Z',
    },
    {
      schedule_version_id: SCHEDULE_VERSION_IDS.PROJECT_3,
      project_id: PROJECT_IDS.PROJECT_3,
      version_no: 1,
      status: 'applied',
      upload_kind: 'initial_baseline',
      scope_mode: 'every_task',
      status_date: '2026-08-10',
      source_file_id: FILE_IDS.PROJECT_3_SCHEDULE,
      file_sha256: 'f'.repeat(64),
      tasks_added: 1, tasks_removed: 0, tasks_modified: 0, pct_overwrites: 0, overdue_task_count: 0,
      uploaded_by: USER_IDS.PLANNER,
      uploaded_at: '2026-08-10T07:00:00Z',
      applied_at: '2026-08-10T07:05:00Z',
    },
  ];
  await knex('schedule_version')
    .insert(scheduleVersions)
    .onConflict('schedule_version_id')
    .merge([
      'project_id', 'version_no', 'status', 'upload_kind', 'scope_mode', 'status_date',
      'source_file_id', 'file_sha256', 'tasks_added', 'tasks_removed', 'tasks_modified',
      'pct_overwrites', 'overdue_task_count', 'uploaded_by', 'uploaded_at', 'applied_at',
    ]);

  // 2. Project metrics snapshot time series (varied per project, trending with occasional dips).
  await knex('project_metrics_snapshot')
    .insert(PROJECT_METRICS)
    .onConflict(['project_id', 'as_of_date'])
    .merge([
      'schedule_version_id', 'planned_pct', 'actual_pct', 'spi', 'rag',
      'baseline_finish', 'forecast_finish', 'computed_at',
    ]);

  // 3. Weekly submissions backing each new escalation (AC-ESC-01).
  await knex('weekly_submission')
    .insert(
      ESCALATION_SUBMISSIONS.map((s) => ({
        submission_id: s.submission_id,
        project_id: s.project_id,
        week_start: s.week_start,
        revision_no: 1,
        status: 'approved',
        schedule_version_id: s.schedule_version_id,
        planned_pct: s.planned_pct,
        actual_pct: s.actual_pct,
        spi: s.spi,
        rag: s.rag,
        active_stages: s.active_stages,
        top_risk_text: s.top_risk_text,
        top_action: s.top_action,
        pm_commentary: s.pm_commentary,
        escalate: true,
        escalation_reason: s.escalation_reason,
        is_late: false,
        created_by: s.created_by,
        approved_by: USER_IDS.ADMIN,
        approved_at: s.approved_at,
        updated_at: s.approved_at,
      })),
    )
    .onConflict('submission_id')
    .merge([
      'project_id', 'week_start', 'revision_no', 'status', 'schedule_version_id',
      'planned_pct', 'actual_pct', 'spi', 'rag', 'active_stages', 'top_risk_text',
      'top_action', 'pm_commentary', 'escalate', 'escalation_reason', 'is_late',
      'created_by', 'approved_by', 'approved_at', 'updated_at',
    ]);

  // 4. Escalations + response threads.
  await knex('escalation')
    .insert(
      ESCALATIONS.map((e) => ({
        escalation_id: e.escalation_id,
        submission_id: e.submission_id,
        project_id: e.project_id,
        status: e.status,
        acknowledged_by: e.acknowledged_by,
        acknowledged_at: e.acknowledged_at,
        resolved_by: e.resolved_by,
        resolved_at: e.resolved_at,
      })),
    )
    .onConflict('escalation_id')
    .merge([
      'submission_id', 'project_id', 'status',
      'acknowledged_by', 'acknowledged_at', 'resolved_by', 'resolved_at',
    ]);

  const responses = ESCALATIONS.flatMap((e) =>
    e.responses.map((r) => ({
      response_id: r.response_id,
      escalation_id: e.escalation_id,
      author_id: r.author_id,
      body: r.body,
      is_acknowledgement: r.is_acknowledgement,
      created_at: r.created_at,
    })),
  );
  if (responses.length > 0) {
    await knex('escalation_response')
      .insert(responses)
      .onConflict('response_id')
      .merge(['escalation_id', 'author_id', 'body', 'is_acknowledgement', 'created_at']);
  }
}
