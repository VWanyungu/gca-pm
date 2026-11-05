import type { Knex } from 'knex';
import { randomUUID } from 'crypto';
import { refreshProjectMetrics } from './scheduleRisks.js';

export class ScheduleTaskNotFoundError extends Error {}
export class ScheduleTaskNotEditableError extends Error {}

export interface EditScheduleTaskFields {
  start?: Date;
  expected_finish?: Date;
  baseline_finish?: Date;
  pct_work_complete?: number;
}

export interface EditScheduleTaskParams {
  projectId: string;
  taskId: string;
  editedBy: string;
  timezone: string;
  fields: EditScheduleTaskFields;
}

interface ScheduleTaskRevisionRecord {
  revision_id: string;
  task_id: string;
  schedule_version_id: string;
  source: 'upload' | 'dpr_writeback' | 'manual_edit';
  change_type: 'added' | 'modified' | 'restored';
  parent_task_id: string | null;
  outline_level: number;
  wbs: string | null;
  task_name: string;
  duration_minutes: number;
  baseline_start: Date | null;
  baseline_finish: Date | null;
  start: Date;
  expected_finish: Date;
  actual_start: Date | null;
  actual_finish: Date | null;
  pct_work_complete: string;
  planned_pct_complete: string;
  is_milestone: boolean;
  is_summary: boolean;
  is_critical: boolean;
  task_type: 'fixed_units' | 'fixed_duration' | 'fixed_work';
  predecessors: number[];
  resource_names: string[];
  responsible_user_id: string | null;
}

/**
 * Edits a schedule task's own start/planned-end/actual-complete directly, without a re-upload.
 *
 * - A leaf task (is_summary = false) is always editable.
 * - The project's single top-level row is editable only while it has no child tasks at all
 *   (a schedule uploaded with just that one general row); once leaf tasks exist, that row is
 *   computed from them by refreshProjectMetrics and is rejected here.
 *
 * Same close-then-open revision pattern as uploads/write-backs (ScheduleTaskNotFoundError and
 * ScheduleTaskNotEditableError map to 404/409 at the route). Runs under the same per-project
 * advisory lock a schedule upload and a DPR write-back take, so none of the three can race.
 */
export async function editScheduleTask(
  trx: Knex.Transaction,
  { projectId, taskId, editedBy, timezone, fields }: EditScheduleTaskParams,
): Promise<{ revision_id: string }> {
  await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [projectId]);

  const task = await trx('schedule_task')
    .where({ project_id: projectId, task_id: taskId })
    .whereNull('removed_in_version_id')
    .first('task_id');
  if (!task) {
    throw new ScheduleTaskNotFoundError('Schedule task not found');
  }

  const current: ScheduleTaskRevisionRecord | undefined = await trx('schedule_task_revision')
    .where({ task_id: taskId })
    .whereNull('valid_to')
    .forUpdate()
    .first('*');
  if (!current) {
    throw new ScheduleTaskNotFoundError('Schedule task not found');
  }

  if (current.is_summary) {
    const hasLeafTasks = await trx('schedule_task as t')
      .join('schedule_task_revision as r', 'r.task_id', 't.task_id')
      .where({ 't.project_id': projectId })
      .whereNull('t.removed_in_version_id')
      .whereNull('r.valid_to')
      .andWhere('r.is_summary', false)
      .first('t.task_id');
    if (hasLeafTasks) {
      throw new ScheduleTaskNotEditableError(
        'The project summary is computed from its tasks; edit the tasks instead.',
      );
    }
  }

  const nextStart = fields.start ?? current.start;
  const nextFinish = fields.expected_finish ?? current.expected_finish;
  if (nextFinish < nextStart) {
    throw new Error('Planned end date cannot be before the start date');
  }
  const nextBaselineFinish = fields.baseline_finish ?? current.baseline_finish;
  if (nextBaselineFinish && nextBaselineFinish < nextStart) {
    throw new Error('Planned finish date cannot be before the start date');
  }

  const appliedAt = new Date();
  const revisionId = randomUUID();

  await trx('schedule_task_revision')
    .where({ revision_id: current.revision_id })
    .update({ valid_to: appliedAt });

  await trx('schedule_task_revision').insert({
    revision_id: revisionId,
    task_id: current.task_id,
    schedule_version_id: current.schedule_version_id,
    source: 'manual_edit',
    dpr_activity_progress_id: null,
    change_type: 'modified',
    valid_from: appliedAt,
    valid_to: null,
    parent_task_id: current.parent_task_id,
    outline_level: current.outline_level,
    wbs: current.wbs,
    task_name: current.task_name,
    duration_minutes: current.duration_minutes,
    baseline_start: current.baseline_start,
    baseline_finish: nextBaselineFinish,
    start: nextStart,
    expected_finish: nextFinish,
    actual_start: current.actual_start,
    actual_finish: current.actual_finish,
    pct_work_complete: fields.pct_work_complete ?? current.pct_work_complete,
    planned_pct_complete: current.planned_pct_complete,
    is_milestone: current.is_milestone,
    is_summary: current.is_summary,
    is_critical: current.is_critical,
    task_type: current.task_type,
    predecessors: JSON.stringify(current.predecessors),
    resource_names: current.resource_names,
    responsible_user_id: current.responsible_user_id,
    edited_by: editedBy,
  });

  // AC-SCH-08 precedent: a manual edit overwriting a site write-back is recorded for the PM to
  // reconcile, same as an upload overwriting one. The edit always wins; it is never blocked.
  if (
    current.source === 'dpr_writeback' &&
    fields.pct_work_complete !== undefined &&
    Number(current.pct_work_complete) !== fields.pct_work_complete
  ) {
    await trx('schedule_reconciliation_flag').insert({
      flag_id: randomUUID(),
      project_id: projectId,
      task_id: current.task_id,
      overwritten_revision_id: current.revision_id,
      overwriting_revision_id: revisionId,
    });
  }

  await refreshProjectMetrics(trx, projectId, current.schedule_version_id, timezone);

  return { revision_id: revisionId };
}
