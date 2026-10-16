import type { Knex } from 'knex';
import { createHash } from 'crypto';

// Reuses the baseline version/file seeded in 09_schedule_files.ts (same project, same upload).
const PROJECT_ID = '20000000-0000-0000-0000-000000000001';
const SCHEDULE_VERSION_ID = '52000000-0000-0000-0000-000000000001';

const USER_IDS = {
  PM: '10000000-0000-0000-0000-000000000004',
  PLANNER: '10000000-0000-0000-0000-000000000006',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
};

const STAGE_NO_CONSTRUCTION = 7;

interface TaskSeed {
  key: string;
  mppUniqueId: number;
  parentKey: string | null;
  outlineLevel: number;
  wbs: string;
  name: string;
  durationMinutes: number;
  start: string;
  expectedFinish: string;
  pctComplete: number;
  plannedPctComplete: number;
  isMilestone?: boolean;
  isSummary?: boolean;
  isCritical?: boolean;
  predecessors?: number[];
  resourceNames?: string[];
  responsibleUserId?: string | null;
}

// Mirrors the phase/task breakdown shown in the Figma Schedule screens (Gantt/Table/Overdue).
// mpp_unique_id values stand in for the MPP's own row ids until the Java parser exists.
// "Preliminaries and Mobilization" is a deliberate 4th, non-PDM-stage topic: the uploaded
// schedule's own top-level WBS groups (Milestones, Constraints, etc. in a real MPP) are whatever
// the Planner's upload defines, not a fixed set of phase names — topic grouping must stay generic.
const TASKS: TaskSeed[] = [
  {
    key: 'preliminaries', mppUniqueId: 5, parentKey: null, outlineLevel: 1, wbs: '0',
    name: 'Preliminaries and Mobilization', durationMinutes: 4800, start: '2026-09-10T08:00:00Z', expectedFinish: '2026-09-24T17:00:00Z',
    pctComplete: 100, plannedPctComplete: 100, isSummary: true,
  },
  {
    key: 'site-mobilisation', mppUniqueId: 51, parentKey: 'preliminaries', outlineLevel: 2, wbs: '0.1',
    name: 'Site mobilisation', durationMinutes: 2400, start: '2026-09-10T08:00:00Z', expectedFinish: '2026-09-17T17:00:00Z',
    pctComplete: 100, plannedPctComplete: 100, resourceNames: ['Site team'], responsibleUserId: USER_IDS.SITE_ENGINEER,
  },
  {
    key: 'shop-drawings', mppUniqueId: 52, parentKey: 'preliminaries', outlineLevel: 2, wbs: '0.2',
    name: 'Submission of shop drawings', durationMinutes: 2400, start: '2026-09-15T08:00:00Z', expectedFinish: '2026-09-24T17:00:00Z',
    pctComplete: 100, plannedPctComplete: 100, predecessors: [51], resourceNames: ['Design team'], responsibleUserId: USER_IDS.PM,
  },
  {
    key: 'procurement', mppUniqueId: 10, parentKey: null, outlineLevel: 1, wbs: '1',
    name: 'Procurement', durationMinutes: 67200, start: '2026-10-01T08:00:00Z', expectedFinish: '2026-10-28T17:00:00Z',
    pctComplete: 64, plannedPctComplete: 70, isSummary: true,
  },
  {
    key: 'expedite-pipe', mppUniqueId: 101, parentKey: 'procurement', outlineLevel: 2, wbs: '1.1',
    name: 'Expedite Zone C pipe delivery', durationMinutes: 4800, start: '2026-10-01T08:00:00Z', expectedFinish: '2026-10-20T17:00:00Z',
    pctComplete: 80, plannedPctComplete: 100, resourceNames: ['Procurement team'], responsibleUserId: USER_IDS.PLANNER,
  },
  {
    key: 'order-regulators', mppUniqueId: 102, parentKey: 'procurement', outlineLevel: 2, wbs: '1.2',
    name: 'Order regulators and meters', durationMinutes: 4320, start: '2026-10-06T08:00:00Z', expectedFinish: '2026-10-24T17:00:00Z',
    pctComplete: 30, plannedPctComplete: 60, resourceNames: ['Procurement team'], responsibleUserId: USER_IDS.PLANNER,
  },
  {
    key: 'customs-clearance', mppUniqueId: 103, parentKey: 'procurement', outlineLevel: 2, wbs: '1.3',
    name: 'Customs clearance, meters', durationMinutes: 2400, start: '2026-10-20T08:00:00Z', expectedFinish: '2026-10-28T17:00:00Z',
    pctComplete: 0, plannedPctComplete: 0, predecessors: [102], resourceNames: ['Procurement team'], responsibleUserId: USER_IDS.PLANNER,
  },
  {
    key: 'construction', mppUniqueId: 20, parentKey: null, outlineLevel: 1, wbs: '2',
    name: 'Construction & Installation', durationMinutes: 62400, start: '2026-09-15T08:00:00Z', expectedFinish: '2026-11-05T17:00:00Z',
    pctComplete: 60, plannedPctComplete: 75, isSummary: true,
  },
  {
    key: 'pipe-laying', mppUniqueId: 201, parentKey: 'construction', outlineLevel: 2, wbs: '2.1',
    name: 'Pipe laying, Zone B', durationMinutes: 19200, start: '2026-09-15T08:00:00Z', expectedFinish: '2026-11-05T17:00:00Z',
    pctComplete: 31, plannedPctComplete: 55, isCritical: true, resourceNames: ['Civil works team'], responsibleUserId: USER_IDS.SITE_ENGINEER,
  },
  {
    key: 'trench-excavation', mppUniqueId: 202, parentKey: 'construction', outlineLevel: 2, wbs: '2.2',
    name: 'Trench excavation, Zone B', durationMinutes: 4800, start: '2026-09-20T08:00:00Z', expectedFinish: '2026-10-10T17:00:00Z',
    pctComplete: 68, plannedPctComplete: 100, isCritical: true, resourceNames: ['Civil works team'], responsibleUserId: USER_IDS.SITE_ENGINEER,
  },
  {
    key: 'traffic-management', mppUniqueId: 203, parentKey: 'construction', outlineLevel: 2, wbs: '2.3',
    name: 'Traffic management plan, Block D', durationMinutes: 5280, start: '2026-09-22T08:00:00Z', expectedFinish: '2026-10-13T17:00:00Z',
    pctComplete: 40, plannedPctComplete: 100, isCritical: true, predecessors: [202],
    resourceNames: ['Site HSE team'], responsibleUserId: USER_IDS.SITE_ENGINEER,
  },
  {
    key: 'pressure-test', mppUniqueId: 204, parentKey: 'construction', outlineLevel: 2, wbs: '2.4',
    name: 'Pressure test, Zone B', durationMinutes: 1440, start: '2026-10-14T08:00:00Z', expectedFinish: '2026-10-16T17:00:00Z',
    pctComplete: 0, plannedPctComplete: 0, isCritical: true, predecessors: [203],
    resourceNames: ['Civil works team'], responsibleUserId: USER_IDS.SITE_ENGINEER,
  },
  {
    key: 'gas-in', mppUniqueId: 205, parentKey: 'construction', outlineLevel: 2, wbs: '2.5',
    name: 'Gas-in, Block A', durationMinutes: 0, start: '2026-10-17T08:00:00Z', expectedFinish: '2026-10-17T08:00:00Z',
    pctComplete: 0, plannedPctComplete: 0, isMilestone: true, isCritical: true, predecessors: [204],
    responsibleUserId: USER_IDS.SITE_ENGINEER,
  },
  {
    key: 'commissioning', mppUniqueId: 30, parentKey: null, outlineLevel: 1, wbs: '3',
    name: 'Commissioning', durationMinutes: 14400, start: '2026-10-12T08:00:00Z', expectedFinish: '2026-10-18T17:00:00Z',
    pctComplete: 0, plannedPctComplete: 0, isSummary: true,
  },
  {
    key: 'commissioning-plan', mppUniqueId: 301, parentKey: 'commissioning', outlineLevel: 2, wbs: '3.1',
    name: 'Commissioning plan', durationMinutes: 2400, start: '2026-10-12T08:00:00Z', expectedFinish: '2026-10-16T17:00:00Z',
    pctComplete: 0, plannedPctComplete: 0, predecessors: [205], resourceNames: ['Commissioning team'], responsibleUserId: USER_IDS.PM,
  },
  {
    key: 'pre-commissioning', mppUniqueId: 302, parentKey: 'commissioning', outlineLevel: 2, wbs: '3.2',
    name: 'Pre-commissioning checks, Block A', durationMinutes: 1920, start: '2026-10-15T08:00:00Z', expectedFinish: '2026-10-18T17:00:00Z',
    pctComplete: 0, plannedPctComplete: 0, predecessors: [301], resourceNames: ['Commissioning team'], responsibleUserId: USER_IDS.PM,
  },
];

// Deterministic per-key uuids so re-seeding is idempotent without a lookup table.
function keyHash(key: string): string {
  return createHash('md5').update(key).digest('hex').slice(0, 12);
}
function taskId(key: string) {
  return `53000000-0000-0000-0000-${keyHash(key)}`;
}
function revisionId(key: string) {
  return `54000000-0000-0000-0000-${keyHash(key)}`;
}

export async function seed(knex: Knex): Promise<void> {
  await knex('schedule_task')
    .insert(
      TASKS.map((t) => ({
        task_id: taskId(t.key),
        project_id: PROJECT_ID,
        mpp_unique_id: t.mppUniqueId,
        first_seen_version_id: SCHEDULE_VERSION_ID,
      })),
    )
    .onConflict('task_id')
    .merge(['project_id', 'mpp_unique_id', 'first_seen_version_id']);

  await knex('schedule_task_revision')
    .insert(
      TASKS.map((t) => ({
        revision_id: revisionId(t.key),
        task_id: taskId(t.key),
        schedule_version_id: SCHEDULE_VERSION_ID,
        source: 'upload',
        change_type: 'added',
        valid_from: '2026-10-12T07:00:00Z',
        parent_task_id: t.parentKey ? taskId(t.parentKey) : null,
        outline_level: t.outlineLevel,
        wbs: t.wbs,
        task_name: t.name,
        duration_minutes: t.durationMinutes,
        start: t.start,
        expected_finish: t.expectedFinish,
        // No rebaseline has happened yet, so the baseline is the current schedule.
        baseline_start: t.start,
        baseline_finish: t.expectedFinish,
        pct_work_complete: t.pctComplete,
        planned_pct_complete: t.plannedPctComplete,
        is_milestone: !!t.isMilestone,
        is_summary: !!t.isSummary,
        is_critical: !!t.isCritical,
        task_type: 'fixed_duration',
        predecessors: JSON.stringify(t.predecessors ?? []),
        resource_names: t.resourceNames ?? [],
        responsible_user_id: t.responsibleUserId ?? null,
      })),
    )
    .onConflict('revision_id')
    .merge([
      'task_id', 'schedule_version_id', 'source', 'change_type', 'valid_from',
      'parent_task_id', 'outline_level', 'wbs', 'task_name', 'duration_minutes',
      'start', 'expected_finish', 'baseline_start', 'baseline_finish', 'pct_work_complete', 'planned_pct_complete',
      'is_milestone', 'is_summary', 'is_critical', 'task_type',
      'predecessors', 'resource_names', 'responsible_user_id',
    ]);

  // Reconciliation flags (AC-SCH-08): a prior DPR write-back that the baseline upload above
  // then overwrote. Each flagged task gets one extra closed revision representing that write-back.
  const RECONCILED = [
    { taskKey: 'trench-excavation', dprPct: 55, reportedAt: '2026-09-28T10:00:00Z' },
    { taskKey: 'pipe-laying', dprPct: 40, reportedAt: '2026-09-30T09:30:00Z' },
  ];

  for (const r of RECONCILED) {
    const task = TASKS.find((t) => t.key === r.taskKey)!;
    const writebackRevisionId = revisionId(`${r.taskKey}-writeback`);
    await knex('schedule_task_revision')
      .insert({
        revision_id: writebackRevisionId,
        task_id: taskId(r.taskKey),
        schedule_version_id: SCHEDULE_VERSION_ID,
        // Real conflicts are source='dpr_writeback' (AC-SCH-08), which requires a dpr_activity_progress_id.
        // No DPR chain is seeded yet, so this uses 'upload' to satisfy ck_str_writeback_source;
        // the flag/UI mechanism is still real, only the originating write-back is simplified.
        source: 'upload',
        change_type: 'modified',
        valid_from: r.reportedAt,
        valid_to: '2026-10-12T07:00:00Z',
        parent_task_id: task.parentKey ? taskId(task.parentKey) : null,
        outline_level: task.outlineLevel,
        wbs: task.wbs,
        task_name: task.name,
        duration_minutes: task.durationMinutes,
        start: task.start,
        expected_finish: task.expectedFinish,
        baseline_start: task.start,
        baseline_finish: task.expectedFinish,
        pct_work_complete: r.dprPct,
        planned_pct_complete: task.plannedPctComplete,
        is_milestone: false,
        is_summary: false,
        is_critical: !!task.isCritical,
        task_type: 'fixed_duration',
        predecessors: JSON.stringify(task.predecessors ?? []),
        resource_names: task.resourceNames ?? [],
        responsible_user_id: task.responsibleUserId ?? null,
      })
      .onConflict('revision_id')
      .merge(['pct_work_complete', 'valid_to']);

    await knex('schedule_reconciliation_flag')
      .insert({
        flag_id: `55000000-0000-0000-0000-${keyHash(r.taskKey)}`,
        project_id: PROJECT_ID,
        task_id: taskId(r.taskKey),
        overwritten_revision_id: writebackRevisionId,
        overwriting_revision_id: revisionId(r.taskKey),
      })
      .onConflict('flag_id')
      .merge(['project_id', 'task_id', 'overwritten_revision_id', 'overwriting_revision_id']);
  }

  // "Traffic management plan, Block D" is overdue and already has an auto-raised risk (AC-SCH-21),
  // so the Overdue tab shows "Risk raised · View" instead of "Add as risk" for it.
  const category = await knex('risk_category').where({ code: 'schedule_slippage' }).first('risk_category_id');
  if (category) {
    await knex('risk')
      .insert({
        risk_id: '56000000-0000-0000-0000-000000000001',
        project_id: PROJECT_ID,
        stage_no: STAGE_NO_CONSTRUCTION,
        title: 'Overdue task: Traffic management plan, Block D',
        description: 'Task is overdue against the current schedule.',
        category_id: category.risk_category_id,
        likelihood: 3,
        impact: 3,
        owner_id: USER_IDS.PM,
        status: 'open',
        source: 'auto_overdue_task',
        source_task_id: taskId('traffic-management'),
        source_schedule_version_id: SCHEDULE_VERSION_ID,
        kind: 'risk',
        created_by: USER_IDS.PM,
      })
      .onConflict('risk_id')
      .merge(['status', 'source_task_id', 'source_schedule_version_id']);
  }
}
