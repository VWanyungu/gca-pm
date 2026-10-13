import type { Knex } from 'knex';

const USER_IDS = {
  PM: '10000000-0000-0000-0000-000000000004',
  PLANNER: '10000000-0000-0000-0000-000000000006',
  SITE_ENGINEER: '10000000-0000-0000-0000-000000000007',
};

const PROJECT_ID = '20000000-0000-0000-0000-000000000001';
const SCHEDULE_VERSION_ID = '52000000-0000-0000-0000-000000000001';
const TASK_ID = '52000000-0000-0000-0000-000000000002';
const PRIOR_REVISION_ID = '52000000-0000-0000-0000-000000000003';
const CURRENT_REVISION_ID = '52000000-0000-0000-0000-000000000004';
const ACTIVITY_ATTACHMENT_ID = '52000000-0000-0000-0000-000000000006';
const FILE_IDS = {
  SCHEDULE: '56000000-0000-0000-0000-000000000001',
  ACTIVITY_ATTACHMENT: '56000000-0000-0000-0000-000000000002',
  DPR_PHOTO: '56000000-0000-0000-0000-000000000003',
  CLIENT_REPORT: '56000000-0000-0000-0000-000000000004',
};

const activityId = '51000000-0000-0000-0000-000000000004';

export async function seed(knex: Knex): Promise<void> {
  const files = [
    {
      file_id: FILE_IDS.SCHEDULE,
      project_id: PROJECT_ID,
      purpose: 'schedule_mpp',
      variant: 'original',
      storage_key: 'seed/projects/mombasa/schedule-baseline.mpp',
      original_filename: 'schedule-baseline.mpp',
      mime_type: 'application/vnd.ms-project',
      size_bytes: 2048,
      sha256: 'a'.repeat(64),
      status: 'available',
      uploaded_by: USER_IDS.PLANNER,
    },
    {
      file_id: FILE_IDS.ACTIVITY_ATTACHMENT,
      project_id: PROJECT_ID,
      purpose: 'activity_attachment',
      variant: 'original',
      storage_key: 'seed/projects/mombasa/foundation-inspection.jpg',
      original_filename: 'foundation-inspection.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 4096,
      sha256: 'b'.repeat(64),
      status: 'available',
      uploaded_by: USER_IDS.SITE_ENGINEER,
    },
    {
      file_id: FILE_IDS.DPR_PHOTO,
      project_id: PROJECT_ID,
      purpose: 'dpr_photo',
      variant: 'original',
      storage_key: 'seed/projects/mombasa/dpr/foundation-progress.jpg',
      original_filename: 'foundation-progress.jpg',
      mime_type: 'image/jpeg',
      size_bytes: 6144,
      sha256: 'c'.repeat(64),
      status: 'available',
      uploaded_by: USER_IDS.SITE_ENGINEER,
    },
    {
      file_id: FILE_IDS.CLIENT_REPORT,
      project_id: PROJECT_ID,
      purpose: 'client_report_pdf',
      variant: 'original',
      storage_key: 'seed/projects/mombasa/reports/weekly-report.pdf',
      original_filename: 'weekly-report.pdf',
      mime_type: 'application/pdf',
      size_bytes: 8192,
      sha256: 'd'.repeat(64),
      status: 'available',
      uploaded_by: USER_IDS.PM,
    },
  ];

  await knex('file_object')
    .insert(files)
    .onConflict('file_id')
    .merge([
      'project_id',
      'purpose',
      'variant',
      'storage_key',
      'original_filename',
      'mime_type',
      'size_bytes',
      'sha256',
      'status',
      'uploaded_by',
    ]);

  const scheduleVersion = {
    schedule_version_id: SCHEDULE_VERSION_ID,
    project_id: PROJECT_ID,
    version_no: 1,
    status: 'applied',
    upload_kind: 'initial_baseline',
    scope_mode: 'every_task',
    status_date: '2026-10-12',
    source_file_id: FILE_IDS.SCHEDULE,
    file_sha256: 'a'.repeat(64),
    tasks_added: 1,
    tasks_removed: 0,
    tasks_modified: 0,
    pct_overwrites: 0,
    overdue_risks_created: 0,
    uploaded_by: USER_IDS.PLANNER,
    uploaded_at: '2026-10-12T07:00:00Z',
    applied_at: '2026-10-12T07:05:00Z',
  };

  await knex('schedule_version')
    .insert(scheduleVersion)
    .onConflict('schedule_version_id')
    .merge([
      'project_id',
      'version_no',
      'status',
      'upload_kind',
      'scope_mode',
      'status_date',
      'source_file_id',
      'file_sha256',
      'tasks_added',
      'tasks_removed',
      'tasks_modified',
      'pct_overwrites',
      'overdue_risks_created',
      'uploaded_by',
      'uploaded_at',
      'applied_at',
    ]);

  await knex('schedule_task')
    .insert({
      task_id: TASK_ID,
      project_id: PROJECT_ID,
      mpp_unique_id: 7001,
      first_seen_version_id: SCHEDULE_VERSION_ID,
    })
    .onConflict('task_id')
    .merge(['project_id', 'mpp_unique_id', 'first_seen_version_id']);

  const revisions = [
    {
      revision_id: PRIOR_REVISION_ID,
      task_id: TASK_ID,
      schedule_version_id: SCHEDULE_VERSION_ID,
      source: 'upload',
      change_type: 'added',
      valid_from: '2026-10-01T08:00:00Z',
      valid_to: '2026-10-12T07:00:00Z',
      outline_level: 1,
      wbs: '1.1',
      task_name: 'Prepare tank foundation',
      duration_minutes: 10080,
      baseline_start: '2026-10-01T08:00:00Z',
      baseline_finish: '2026-10-08T17:00:00Z',
      start: '2026-10-01T08:00:00Z',
      expected_finish: '2026-10-08T17:00:00Z',
      pct_work_complete: 0,
      planned_pct_complete: 0,
      is_milestone: false,
      is_summary: false,
      is_critical: true,
      task_type: 'fixed_duration',
      predecessors: [],
      resource_names: ['Civil works team'],
    },
    {
      revision_id: CURRENT_REVISION_ID,
      task_id: TASK_ID,
      schedule_version_id: SCHEDULE_VERSION_ID,
      source: 'upload',
      change_type: 'modified',
      valid_from: '2026-10-12T07:00:00Z',
      outline_level: 1,
      wbs: '1.1',
      task_name: 'Prepare tank foundation',
      duration_minutes: 14400,
      baseline_start: '2026-10-01T08:00:00Z',
      baseline_finish: '2026-10-08T17:00:00Z',
      start: '2026-10-01T08:00:00Z',
      expected_finish: '2026-10-12T17:00:00Z',
      pct_work_complete: 35,
      planned_pct_complete: 100,
      is_milestone: false,
      is_summary: false,
      is_critical: true,
      task_type: 'fixed_duration',
      predecessors: [],
      resource_names: ['Civil works team'],
    },
  ];

  await knex('schedule_task_revision')
    .insert(revisions)
    .onConflict('revision_id')
    .merge([
      'task_id',
      'schedule_version_id',
      'source',
      'change_type',
      'valid_from',
      'valid_to',
      'outline_level',
      'wbs',
      'task_name',
      'duration_minutes',
      'baseline_start',
      'baseline_finish',
      'start',
      'expected_finish',
      'pct_work_complete',
      'planned_pct_complete',
      'is_milestone',
      'is_summary',
      'is_critical',
      'task_type',
      'predecessors',
      'resource_names',
    ]);

  await knex('schedule_reconciliation_flag')
    .insert({
      flag_id: '52000000-0000-0000-0000-000000000005',
      project_id: PROJECT_ID,
      task_id: TASK_ID,
      overwritten_revision_id: PRIOR_REVISION_ID,
      overwriting_revision_id: CURRENT_REVISION_ID,
    })
    .onConflict('flag_id')
    .merge([
      'project_id',
      'task_id',
      'overwritten_revision_id',
      'overwriting_revision_id',
    ]);

  await knex('project_metrics_snapshot')
    .insert({
      project_id: PROJECT_ID,
      as_of_date: '2026-10-12',
      schedule_version_id: SCHEDULE_VERSION_ID,
      planned_pct: 100,
      actual_pct: 35,
      spi: 0.35,
      rag: 'red',
      baseline_finish: '2026-11-30',
      forecast_finish: '2026-12-20',
    })
    .onConflict(['project_id', 'as_of_date'])
    .merge([
      'schedule_version_id',
      'planned_pct',
      'actual_pct',
      'spi',
      'rag',
      'baseline_finish',
      'forecast_finish',
      'computed_at',
    ]);

  await knex('stage_activity_attachment')
    .insert({
      attachment_id: ACTIVITY_ATTACHMENT_ID,
      activity_id: activityId,
      file_id: FILE_IDS.ACTIVITY_ATTACHMENT,
      caption: 'Foundation inspection record',
      access_url:
        'https://res.cloudinary.com/gas-connect-africa/image/upload/seed/projects/mombasa/foundation-inspection.jpg',
      sort_order: 1,
      uploaded_by: USER_IDS.SITE_ENGINEER,
    })
    .onConflict('attachment_id')
    .merge([
      'activity_id',
      'file_id',
      'caption',
      'access_url',
      'sort_order',
      'uploaded_by',
    ]);
}
