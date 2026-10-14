import type { Knex } from 'knex';

// Mirrors of ids from earlier seeds (inlined — knex ESM seeds don't cross-import cleanly here).
const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PM: '10000000-0000-0000-0000-000000000004',
  PM_2: '10000000-0000-0000-0000-000000000005',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
  SITE_ENGINEER_2: '10000000-0000-0000-0000-000000000008',
};

const PROJECT_IDS = {
  PROJECT_1: '20000000-0000-0000-0000-000000000001',
  PROJECT_2: '20000000-0000-0000-0000-000000000002',
  PROJECT_3: '20000000-0000-0000-0000-000000000003',
};

// New id ranges continuing the scheme from 12_escalations_and_metrics.ts
// (60000000 submissions, 61000000 escalations, 62000000 responses,
// 63000000 schedule versions, 64000000 schedule files):
//   65000000 — stage_activity (overdue "needs attention" items)
//   66000000 — custom_milestones

interface ActivitySeed {
  activity_id: string;
  project_id: string;
  stage_no: number;
  title: string;
  description: string;
  due_date: string;
  owner_id: string;
  created_by: string;
}

// Overdue stage activities (status='open', due_date in the past relative to
// 2026-10-14 "today"). Severity/how-far-overdue is proportionate to each
// project's narrative in seed 12: Project 1 is badly behind (red, SPI ~0.3),
// Project 2 is generally on track with one dip (amber), Project 3 has only
// just started recovering (amber, stage barely begun in Aug). All three
// stage_no values are the project's current active stage (7 / 4 / 3), which
// has been active for months in every case, so overdue work items are
// plausible even for the "early-stage" projects 2 and 3.
const OVERDUE_ACTIVITIES: ActivitySeed[] = [
  // Project 1 — Mombasa, stage 7 Construction, well behind schedule.
  {
    activity_id: '65000000-0000-0000-0000-000000000001',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Procure and deliver LPG tank valves',
    description: 'Outstanding valve order blocking tank installation.',
    due_date: '2026-09-10',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000002',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Mobilise additional civil works crew',
    description: 'Additional crew required to recover schedule slippage.',
    due_date: '2026-09-20',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000003',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Complete tank foundation rebar inspection',
    description: 'Inspection sign-off needed before concrete pour.',
    due_date: '2026-09-25',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000004',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Install containment bund perimeter wall',
    description: 'Bund wall works trailing behind the civil works programme.',
    due_date: '2026-10-01',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000005',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Submit updated construction recovery plan',
    description: 'Recovery plan requested by ExCo following the schedule escalation.',
    due_date: '2026-10-08',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM,
  },

  // Project 2 — Nairobi reticulation, stage 4 PMC, generally on track.
  {
    activity_id: '65000000-0000-0000-0000-000000000006',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 4,
    title: 'Finalise way-leave approvals for corridor segment A',
    description: 'County sign-off still outstanding for segment A.',
    due_date: '2026-09-20',
    owner_id: USER_IDS.SITE_ENGINEER_2,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000007',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 4,
    title: 'Submit updated PMC deliverables for segment B',
    description: 'PMC package pending final review before submission.',
    due_date: '2026-09-28',
    owner_id: USER_IDS.SITE_ENGINEER_2,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000008',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 4,
    title: 'Complete geotechnical survey — Enterprise Road',
    description: 'Survey crew delayed by site access scheduling.',
    due_date: '2026-10-02',
    owner_id: USER_IDS.SITE_ENGINEER_2,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000009',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 4,
    title: 'Review contractor prequalification submissions',
    description: 'Prequalification review running behind the procurement timeline.',
    due_date: '2026-10-07',
    owner_id: USER_IDS.SITE_ENGINEER_2,
    created_by: USER_IDS.PM,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000010',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 4,
    title: 'Confirm utility relocation plan with KPLC',
    description: 'Relocation plan sign-off needed before trenching can be scheduled.',
    due_date: '2026-10-10',
    owner_id: USER_IDS.SITE_ENGINEER_2,
    created_by: USER_IDS.PM,
  },

  // Project 3 — Eldoret CNG, stage 3 Structuring & Financing, only just recovering.
  {
    activity_id: '65000000-0000-0000-0000-000000000011',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 3,
    title: 'Finalise lender term sheet documentation',
    description: 'Final documentation pack pending legal review.',
    due_date: '2026-09-25',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM_2,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000012',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 3,
    title: 'Complete feasibility study sign-off',
    description: 'Feasibility sign-off outstanding from the technical committee.',
    due_date: '2026-10-01',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM_2,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000013',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 3,
    title: 'Submit financial close checklist',
    description: 'Checklist submission required ahead of stage 4 planning.',
    due_date: '2026-10-05',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM_2,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000014',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 3,
    title: 'Confirm site lease agreement with depot owner',
    description: 'Lease terms awaiting counter-signature from the depot owner.',
    due_date: '2026-10-08',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM_2,
  },
  {
    activity_id: '65000000-0000-0000-0000-000000000015',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 3,
    title: 'Schedule structuring workshop follow-up',
    description: 'Follow-up workshop to close out remaining structuring items.',
    due_date: '2026-10-11',
    owner_id: USER_IDS.SITE_ENGINEER,
    created_by: USER_IDS.PM_2,
  },
];

interface MilestoneSeed {
  milestone_id: string;
  project_id: string;
  stage_no: number;
  title: string;
  planned_date: string;
  forecast_date: string | null;
  actual_date: string | null;
  notes: string;
  created_by: string;
}

// Custom milestones (AC-SCH-40: stage tag must be an in-scope stage of the
// project — all stages 1-8 are in scope for every seeded project). Dates mix
// past/overdue, near-term upcoming and far-future, with overdue severity kept
// proportionate to each project's progress: Project 1 (badly behind) has two
// slipped milestones, Project 2 (on track, one dip) has one mildly slipped
// milestone, and Project 3 (barely started stage 3) has none overdue yet.
const MILESTONES: MilestoneSeed[] = [
  // Project 1 — Mombasa
  {
    milestone_id: '66000000-0000-0000-0000-000000000001',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Tank foundation complete',
    planned_date: '2026-09-30',
    forecast_date: '2026-10-25',
    actual_date: null,
    notes: 'Slipping behind the construction baseline alongside the wider schedule delay.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000002',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Pipe laying — Phase 1',
    planned_date: '2026-10-10',
    forecast_date: '2026-11-05',
    actual_date: null,
    notes: 'Dependent on valve delivery; forecast pushed out accordingly.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000003',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 7,
    title: 'Pressure test — storage tanks',
    planned_date: '2026-11-20',
    forecast_date: '2026-12-01',
    actual_date: null,
    notes: 'Upcoming once tank installation is complete.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000004',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 8,
    title: 'Client handover',
    planned_date: '2026-11-30',
    forecast_date: '2026-12-10',
    actual_date: null,
    notes: 'Handover to Kenya Pipeline Company following commissioning.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000005',
    project_id: PROJECT_IDS.PROJECT_1,
    stage_no: 8,
    title: 'Final inspection',
    planned_date: '2027-01-15',
    forecast_date: '2027-01-15',
    actual_date: null,
    notes: 'Final regulatory inspection ahead of project close-out.',
    created_by: USER_IDS.PM,
  },

  // Project 2 — Nairobi reticulation
  {
    milestone_id: '66000000-0000-0000-0000-000000000006',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 4,
    title: 'Way-leave approvals secured',
    planned_date: '2026-10-01',
    forecast_date: '2026-10-20',
    actual_date: null,
    notes: 'Minor slippage while two corridor segments are outstanding with the county.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000007',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 4,
    title: 'PMC design package complete',
    planned_date: '2026-11-10',
    forecast_date: '2026-11-15',
    actual_date: null,
    notes: 'On track pending way-leave resolution.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000008',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 5,
    title: 'Trenching complete — Phase 1',
    planned_date: '2026-12-05',
    forecast_date: '2026-12-05',
    actual_date: null,
    notes: 'Scheduled once design development begins.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000009',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 6,
    title: 'Pipe laying — Phase 1',
    planned_date: '2027-01-20',
    forecast_date: '2027-01-20',
    actual_date: null,
    notes: 'Far-term milestone pending procurement.',
    created_by: USER_IDS.PM,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000010',
    project_id: PROJECT_IDS.PROJECT_2,
    stage_no: 8,
    title: 'Client handover',
    planned_date: '2027-03-01',
    forecast_date: '2027-03-01',
    actual_date: null,
    notes: 'Handover to the Ministry of Energy & Petroleum.',
    created_by: USER_IDS.PM,
  },

  // Project 3 — Eldoret CNG (stage 3 only just started recovering — no
  // overdue milestones yet, all planned/forecast dates are still ahead).
  {
    milestone_id: '66000000-0000-0000-0000-000000000011',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 3,
    title: 'Financial close',
    planned_date: '2026-11-15',
    forecast_date: '2026-11-20',
    actual_date: null,
    notes: 'Term sheet signed; documentation in progress ahead of close.',
    created_by: USER_IDS.PM_2,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000012',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 3,
    title: 'Site survey and feasibility sign-off',
    planned_date: '2026-11-30',
    forecast_date: '2026-11-30',
    actual_date: null,
    notes: 'Feasibility inputs being finalised alongside the financing workstream.',
    created_by: USER_IDS.PM_2,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000013',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 5,
    title: 'Compressor installation',
    planned_date: '2026-12-20',
    forecast_date: '2026-12-20',
    actual_date: null,
    notes: 'Scheduled once design and procurement stages begin.',
    created_by: USER_IDS.PM_2,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000014',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 6,
    title: 'Pressure test — CNG station',
    planned_date: '2027-01-10',
    forecast_date: '2027-01-10',
    actual_date: null,
    notes: 'Far-term milestone pending construction.',
    created_by: USER_IDS.PM_2,
  },
  {
    milestone_id: '66000000-0000-0000-0000-000000000015',
    project_id: PROJECT_IDS.PROJECT_3,
    stage_no: 8,
    title: 'Final inspection',
    planned_date: '2027-01-25',
    forecast_date: '2027-01-25',
    actual_date: null,
    notes: 'Final inspection ahead of project close-out.',
    created_by: USER_IDS.PM_2,
  },
];

export async function seed(knex: Knex): Promise<void> {
  // 1. Overdue stage activities — the only one of the three "needs attention"
  // sources that can scale to 5+ distinct rows per project.
  await knex('stage_activity')
    .insert(
      OVERDUE_ACTIVITIES.map((a) => ({
        activity_id: a.activity_id,
        project_id: a.project_id,
        stage_no: a.stage_no,
        title: a.title,
        description: a.description,
        status: 'open',
        due_date: a.due_date,
        owner_id: a.owner_id,
        created_by: a.created_by,
      })),
    )
    .onConflict('activity_id')
    .merge([
      'project_id', 'stage_no', 'title', 'description', 'status', 'due_date',
      'owner_id', 'created_by', 'updated_at',
    ]);

  // 2. Custom milestones (next-milestones-row + /projects/:id/milestones).
  await knex('custom_milestones')
    .insert(
      MILESTONES.map((m) => ({
        milestone_id: m.milestone_id,
        project_id: m.project_id,
        stage_no: m.stage_no,
        title: m.title,
        planned_date: m.planned_date,
        forecast_date: m.forecast_date,
        actual_date: m.actual_date,
        notes: m.notes,
        created_by: m.created_by,
        updated_by: m.created_by,
      })),
    )
    .onConflict('milestone_id')
    .merge([
      'project_id', 'stage_no', 'title', 'planned_date', 'forecast_date',
      'actual_date', 'notes', 'updated_by', 'updated_at',
    ]);
}
