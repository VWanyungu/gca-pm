import type { Knex } from 'knex';
import { randomUUID } from 'crypto';
import db from '../database/dbSetup.js';
import {
  MppParseError,
  MppParserUnavailableError,
  parseMpp,
  type ParsedSchedule,
  type ParsedTask,
  type ParseDiagnostic,
} from './mppParser.js';
import { fetchObjectBytes } from './objectStorage.js';
import { FileObjects } from '../database/utils/database.js';
import {
  autoResolveOverdueRisks,
  countOverdueTasks,
  refreshProjectMetrics,
} from './scheduleRisks.js';
import { notify, projectManagers, executives } from './notifications.js';

/**
 * Turns a queued schedule_version into applied rows, or into a failed one carrying the
 * reason (AC-SCH-04 to AC-SCH-09).
 *
 * Everything after a successful parse happens in one transaction: the task changes, the
 * overdue risks they raise or resolve (AC-SCH-10) and today's metrics (AC-SCH-11) either all
 * land or none of them do. Notifications follow once that transaction has committed.
 */

/** The revision columns that come from the file. Identity, provenance and validity columns
 *  are excluded, and so is responsible_user_id, which the PM sets and an upload must not
 *  touch (AC-SCH-06 "stored fields"). */
interface RevisionFields {
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
  pct_work_complete: number;
  planned_pct_complete: number;
  is_milestone: boolean;
  is_summary: boolean;
  is_critical: boolean;
  is_active: boolean;
  task_type: string;
  predecessors: number[];
  resource_names: string[];
}

export interface ApplySummary {
  version_no: number;
  tasks_added: number;
  tasks_removed: number;
  tasks_modified: number;
  pct_overwrites: number;
  /** Tasks past their expected finish when this version landed — reported, not acted on. */
  overdue_task_count: number;
  overdue_risks_resolved: number;
}

/**
 * Runs one queued version to completion. Safe to call from several processes: the first to
 * move the row out of `queued` owns it and the rest return immediately.
 *
 * `bytes` is the file as just uploaded; without it the object is fetched back from storage,
 * which is what recovery after a restart does.
 */
export async function processScheduleVersion(versionId: string, bytes?: Buffer): Promise<void> {
  const claimed = await db('schedule_version')
    .where({ schedule_version_id: versionId, status: 'queued' })
    .update({ status: 'parsing' })
    .returning(['schedule_version_id', 'project_id', 'source_file_id']);

  const version = claimed[0];
  if (!version) {
    return; // another worker claimed it, or it is no longer queued
  }

  try {
    const fileBytes = bytes ?? (await loadBytes(version.source_file_id));
    const parsed = await parseMpp(fileBytes);
    const summary = await applyParsedSchedule(versionId, version.project_id, parsed);
    // AC-SCH-12 / AC-NTF-01: only after the transaction has committed.
    await announceApplied(versionId, version.project_id, summary).catch((err) =>
      console.error('Schedule applied but notifications failed', versionId, err),
    );
  } catch (err) {
    await markFailed(versionId, diagnosticsFor(err));
  }
}

async function loadBytes(fileId: string): Promise<Buffer> {
  const fileObject = await FileObjects.getById(fileId);
  if (!fileObject) {
    throw new Error('The uploaded file is no longer available');
  }
  return fetchObjectBytes(fileObject);
}

function diagnosticsFor(err: unknown): ParseDiagnostic[] {
  if (err instanceof MppParseError) {
    return err.diagnostics;
  }
  if (err instanceof MppParserUnavailableError) {
    // Not the file's fault, but the version cannot sit in `parsing` forever: it would block
    // every later upload for the project (ux_sv_one_inflight). Fail it so it can be retried.
    return [{ message: `${err.message}. The file was not changed — please upload it again.` }];
  }
  return [{ message: err instanceof Error ? err.message : 'Processing failed' }];
}

async function markFailed(versionId: string, diagnostics: ParseDiagnostic[]): Promise<void> {
  await db('schedule_version')
    .where({ schedule_version_id: versionId })
    .update({ status: 'failed', parse_diagnostics: JSON.stringify(diagnostics) });
}

/**
 * AC-SCH-05 to AC-SCH-09, in a single transaction. The advisory lock keeps concurrent
 * write-backs (AC-SCH-15) off this project's revisions while the diff runs.
 */
export async function applyParsedSchedule(
  versionId: string,
  projectId: string,
  parsed: ParsedSchedule,
): Promise<ApplySummary> {
  return db.transaction(async (trx) => {
    await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [projectId]);

    const project = await trx('projects')
      .where({ project_id: projectId })
      .select('timezone')
      .first();
    if (!project) {
      throw new Error('Project not found');
    }

    // One instant for the whole upload: getChanges() joins a closing revision to its
    // replacement on prev.valid_to = r.valid_from, so these must be exactly equal.
    const appliedAt = new Date();

    const instants = await resolveLocalTimestamps(trx, parsed.tasks, project.timezone);

    const existingTasks = await trx('schedule_task')
      .where({ project_id: projectId })
      .select('task_id', 'mpp_unique_id', 'removed_in_version_id');

    const taskIdByMppId = new Map<number, string>(
      existingTasks.map((t) => [Number(t.mpp_unique_id), t.task_id]),
    );
    const removedByMppId = new Map<number, string | null>(
      existingTasks.map((t) => [Number(t.mpp_unique_id), t.removed_in_version_id]),
    );

    const currentRevisions = existingTasks.length
      ? await trx('schedule_task_revision')
          .whereIn(
            'task_id',
            existingTasks.map((t) => t.task_id),
          )
          .whereNull('valid_to')
          .select('*')
      : [];
    const currentByTaskId = new Map(currentRevisions.map((r) => [r.task_id, r]));

    // Pass one: every parsed task must have a task_id before any revision can name a parent.
    const newTaskRows = parsed.tasks
      .filter((task) => !taskIdByMppId.has(task.mpp_unique_id))
      .map((task) => ({
        task_id: randomUUID(),
        project_id: projectId,
        mpp_unique_id: task.mpp_unique_id,
        first_seen_version_id: versionId,
      }));
    if (newTaskRows.length) {
      await trx('schedule_task').insert(newTaskRows);
      for (const row of newTaskRows) {
        taskIdByMppId.set(row.mpp_unique_id, row.task_id);
      }
    }

    let tasksAdded = 0;
    let tasksModified = 0;
    const revisionsToInsert: Record<string, unknown>[] = [];
    const revisionsToClose: string[] = [];
    const restoredTaskIds: string[] = [];
    const flags: Record<string, unknown>[] = [];

    for (const task of parsed.tasks) {
      const taskId = taskIdByMppId.get(task.mpp_unique_id)!;
      const fields = toRevisionFields(task, taskIdByMppId, instants);
      const current = currentByTaskId.get(taskId);
      const wasRemoved = Boolean(removedByMppId.get(task.mpp_unique_id));

      let changeType: 'added' | 'modified' | 'restored';
      if (!current) {
        changeType = wasRemoved ? 'restored' : 'added';
      } else if (wasRemoved) {
        changeType = 'restored';
      } else if (revisionDiffers(current, fields)) {
        changeType = 'modified';
      } else {
        continue; // unchanged: write nothing (AC-SCH-06)
      }

      const revisionId = randomUUID();
      if (current) {
        revisionsToClose.push(current.revision_id);

        // AC-SCH-08: a Planner's upload beats a site engineer's write-back, but the
        // overwrite is recorded for the PM to reconcile. Equal values are not a conflict.
        if (
          current.source === 'dpr_writeback' &&
          Number(current.pct_work_complete) !== fields.pct_work_complete
        ) {
          flags.push({
            flag_id: randomUUID(),
            project_id: projectId,
            task_id: taskId,
            overwritten_revision_id: current.revision_id,
            overwriting_revision_id: revisionId,
          });
        }
      }
      if (wasRemoved) {
        restoredTaskIds.push(taskId);
      }

      revisionsToInsert.push({
        revision_id: revisionId,
        task_id: taskId,
        schedule_version_id: versionId,
        source: 'upload',
        change_type: changeType,
        valid_from: appliedAt,
        valid_to: null,
        // An upload describes the plan, not who owns it: keep the PM's assignment.
        responsible_user_id: current?.responsible_user_id ?? null,
        ...fields,
        predecessors: JSON.stringify(fields.predecessors),
      });

      if (changeType === 'modified') {
        tasksModified += 1;
      } else {
        // `restored` counts with added: either way the project gained a task this version.
        tasksAdded += 1;
      }
    }

    // AC-SCH-06: anything live that the file no longer mentions has left the schedule.
    const parsedIds = new Set(parsed.tasks.map((t) => t.mpp_unique_id));
    const removedTaskIds = existingTasks
      .filter((t) => !parsedIds.has(Number(t.mpp_unique_id)) && !t.removed_in_version_id)
      .map((t) => t.task_id);

    for (const taskId of removedTaskIds) {
      const current = currentByTaskId.get(taskId);
      if (current) {
        revisionsToClose.push(current.revision_id);
      }
    }

    if (revisionsToClose.length) {
      await trx('schedule_task_revision')
        .whereIn('revision_id', revisionsToClose)
        .update({ valid_to: appliedAt });
    }
    if (revisionsToInsert.length) {
      await trx('schedule_task_revision').insert(revisionsToInsert);
    }
    if (restoredTaskIds.length) {
      await trx('schedule_task')
        .whereIn('task_id', restoredTaskIds)
        .update({ removed_in_version_id: null });
    }
    if (removedTaskIds.length) {
      await trx('schedule_task')
        .whereIn('task_id', removedTaskIds)
        .update({ removed_in_version_id: versionId });
    }
    if (flags.length) {
      await trx('schedule_reconciliation_flag').insert(flags);
    }

    // AC-SCH-10: close risks whose task is no longer overdue, then count what still is.
    // Nothing is raised here — the PM does that from the Overdue tab.
    const risksResolved = await autoResolveOverdueRisks(trx, projectId, project.timezone);
    const overdueTasks = await countOverdueTasks(trx, projectId, project.timezone);

    // AC-SCH-11: today's KPIs, from the tasks this upload just wrote.
    await refreshProjectMetrics(trx, projectId, versionId, project.timezone);

    const latest = await trx('schedule_version')
      .where({ project_id: projectId, status: 'applied' })
      .max('version_no as max')
      .first();
    const versionNo = Number(latest?.max ?? 0) + 1;

    const summary: ApplySummary = {
      version_no: versionNo,
      tasks_added: tasksAdded,
      tasks_removed: removedTaskIds.length,
      tasks_modified: tasksModified,
      pct_overwrites: flags.length,
      overdue_task_count: overdueTasks,
      overdue_risks_resolved: risksResolved,
    };

    await trx('schedule_version')
      .where({ schedule_version_id: versionId })
      .update({
        status: 'applied',
        version_no: versionNo,
        applied_at: appliedAt,
        // AC-SCH-09: already project-local wall clock, so the date part is the local date.
        status_date: parsed.status_date ? parsed.status_date.slice(0, 10) : null,
        tasks_added: summary.tasks_added,
        tasks_removed: summary.tasks_removed,
        tasks_modified: summary.tasks_modified,
        pct_overwrites: summary.pct_overwrites,
        overdue_task_count: summary.overdue_task_count,
        parse_diagnostics: null,
      });

    return summary;
  });
}

/**
 * The parser returns wall-clock times with no zone, because that is what the .mpp holds.
 * Written straight into a timestamptz column they would be read in the server's zone — on a
 * UTC server every Nairobi date silently shifts by three hours (AC-GEN-06).
 *
 * Postgres does the conversion, so DST is handled by the zone database rather than by us.
 * One round trip converts every distinct timestamp in the file.
 */
async function resolveLocalTimestamps(
  trx: Knex.Transaction,
  tasks: ParsedTask[],
  timezone: string,
): Promise<Map<string, Date>> {
  const distinct = new Set<string>();
  for (const task of tasks) {
    for (const value of [
      task.start,
      task.expected_finish,
      task.baseline_start,
      task.baseline_finish,
      task.actual_start,
      task.actual_finish,
    ]) {
      if (value) {
        distinct.add(value);
      }
    }
  }
  if (distinct.size === 0) {
    return new Map();
  }

  const local = [...distinct];
  const { rows } = await trx.raw(
    `SELECT ts, (ts::timestamp AT TIME ZONE ?) AS instant FROM unnest(?::text[]) AS ts`,
    [timezone, local],
  );
  return new Map(rows.map((row: { ts: string; instant: Date }) => [row.ts, row.instant]));
}

function toRevisionFields(
  task: ParsedTask,
  taskIdByMppId: Map<number, string>,
  instants: Map<string, Date>,
): RevisionFields {
  const at = (value: string | null): Date | null => (value ? (instants.get(value) ?? null) : null);
  return {
    // AC-SCH-06: the parent is named by Unique ID in the file and resolved here. A parent
    // outside this upload leaves the task at the top level rather than dangling.
    parent_task_id:
      task.parent_mpp_unique_id === null
        ? null
        : (taskIdByMppId.get(task.parent_mpp_unique_id) ?? null),
    outline_level: task.outline_level,
    wbs: task.wbs,
    task_name: task.task_name,
    duration_minutes: task.duration_minutes,
    baseline_start: at(task.baseline_start),
    baseline_finish: at(task.baseline_finish),
    start: at(task.start)!,
    expected_finish: at(task.expected_finish)!,
    actual_start: at(task.actual_start),
    actual_finish: at(task.actual_finish),
    pct_work_complete: Number(task.pct_work_complete),
    planned_pct_complete: Number(task.planned_pct_complete),
    is_milestone: task.is_milestone,
    is_summary: task.is_summary,
    is_critical: task.is_critical,
    is_active: task.is_active,
    task_type: task.task_type,
    predecessors: task.predecessors,
    resource_names: task.resource_names,
  };
}

/** True when any stored field moved. Numerics come back from pg as strings and timestamps as
 *  Dates, so each type is compared on its value rather than by identity. */
function revisionDiffers(current: Record<string, unknown>, next: RevisionFields): boolean {
  const sameDate = (a: unknown, b: Date | null) => {
    const left = a instanceof Date ? a.getTime() : null;
    const right = b ? b.getTime() : null;
    return left === right;
  };
  // Re-ordering predecessors or resources in MS Project is not a change to the plan.
  const sameList = (a: unknown, b: (string | number)[]) => {
    const left = Array.isArray(a) ? [...a].map(String).sort() : [];
    return JSON.stringify(left) === JSON.stringify([...b].map(String).sort());
  };

  return (
    (current.parent_task_id ?? null) !== next.parent_task_id ||
    Number(current.outline_level) !== next.outline_level ||
    (current.wbs ?? null) !== next.wbs ||
    current.task_name !== next.task_name ||
    Number(current.duration_minutes) !== next.duration_minutes ||
    !sameDate(current.baseline_start, next.baseline_start) ||
    !sameDate(current.baseline_finish, next.baseline_finish) ||
    !sameDate(current.start, next.start) ||
    !sameDate(current.expected_finish, next.expected_finish) ||
    !sameDate(current.actual_start, next.actual_start) ||
    !sameDate(current.actual_finish, next.actual_finish) ||
    Number(current.pct_work_complete) !== next.pct_work_complete ||
    Number(current.planned_pct_complete) !== next.planned_pct_complete ||
    current.is_milestone !== next.is_milestone ||
    current.is_summary !== next.is_summary ||
    current.is_critical !== next.is_critical ||
    current.is_active !== next.is_active ||
    current.task_type !== next.task_type ||
    !sameList(current.predecessors, next.predecessors) ||
    !sameList(current.resource_names, next.resource_names)
  );
}

/**
 * Picks up versions a previous process left behind. `queued` rows are simply run; `parsing`
 * rows mean the worker died mid-parse, and because ux_sv_one_inflight lets only one version
 * per project be in flight, leaving one there would block that project's uploads forever.
 *
 * The grace period keeps this from stealing work from a sibling process that is parsing right
 * now; processScheduleVersion's atomic claim is what makes that safe either way.
 */
export async function recoverScheduleVersions(stuckAfterMinutes = 15): Promise<void> {
  const cutoff = new Date(Date.now() - stuckAfterMinutes * 60_000);

  const abandoned = await db('schedule_version')
    .where({ status: 'parsing' })
    .andWhere('uploaded_at', '<', cutoff)
    .select('schedule_version_id');

  for (const row of abandoned) {
    await markFailed(row.schedule_version_id, [
      { message: 'Processing was interrupted and did not finish. Please upload the file again.' },
    ]);
  }

  const queued = await db('schedule_version').where({ status: 'queued' }).select('schedule_version_id');
  for (const row of queued) {
    await processScheduleVersion(row.schedule_version_id).catch((err) =>
      console.error('Failed to process queued schedule version', row.schedule_version_id, err),
    );
  }

  if (abandoned.length || queued.length) {
    console.log(
      `Schedule recovery: failed ${abandoned.length} abandoned, re-ran ${queued.length} queued`,
    );
  }
}

/**
 * The nightly metrics job AC-SCH-30 to AC-SCH-34 expects: planned % drifts with the calendar
 * even when nobody uploads a schedule, so each project with an applied schedule gets today's
 * snapshot recomputed, not just the day it was last uploaded.
 */
export async function refreshAllProjectMetrics(): Promise<void> {
  const projects: { project_id: string; schedule_version_id: string; timezone: string }[] =
    await db
      .select(
        'p.project_id',
        'sv.schedule_version_id',
        'p.timezone',
      )
      .from('projects as p')
      .join(
        db('schedule_version')
          .select('project_id', 'schedule_version_id')
          .distinctOn('project_id')
          .where({ status: 'applied' })
          .orderBy('project_id')
          .orderBy('applied_at', 'desc')
          .as('sv'),
        'sv.project_id',
        'p.project_id',
      );

  let refreshed = 0;
  for (const project of projects) {
    try {
      await db.transaction(async (trx) => {
        await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [project.project_id]);
        const snapshot = await refreshProjectMetrics(
          trx,
          project.project_id,
          project.schedule_version_id,
          project.timezone,
        );
        if (snapshot) refreshed += 1;
      });
    } catch (err) {
      console.error('Nightly metrics refresh failed for project', project.project_id, err);
    }
  }

  console.log(`Nightly metrics refresh: updated ${refreshed}/${projects.length} projects`);
}

/** Next 3am strictly after `now`, so a run already in progress at 3:00:00.000 isn't repeated. */
export function nextThreeAm(now: Date): Date {
  const next = new Date(now);
  next.setHours(3, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next;
}

export const __testing = { revisionDiffers, toRevisionFields };

/**
 * AC-SCH-12. Sent after the apply transaction commits, so nothing announces a change that
 * was rolled back.
 *
 * The constraints note names four events; the notification_type registry has three codes for
 * them, so a first upload is a `schedule_uploaded` with its own wording and a wider audience
 * rather than a separate type. That also keeps a project's very first upload from sending the
 * PM two near-identical notifications.
 */
async function announceApplied(
  versionId: string,
  projectId: string,
  summary: ApplySummary,
): Promise<void> {
  const [pms, project] = await Promise.all([
    projectManagers(projectId),
    db('projects').where({ project_id: projectId }).first('name'),
  ]);
  const projectName = project?.name ?? 'the project';
  const isFirstUpload = summary.version_no === 1;
  const entity = { projectId, entityType: 'schedule_version', entityId: versionId };

  if (isFirstUpload) {
    await notify({
      ...entity,
      typeCode: 'schedule_uploaded',
      recipientIds: [...pms, ...(await executives())],
      title: 'First schedule uploaded',
      body: `${projectName} now has a schedule. ${summary.tasks_added} tasks were imported.`,
      payload: { ...summary, first_upload: true },
    });
  } else {
    await notify({
      ...entity,
      typeCode: 'schedule_uploaded',
      recipientIds: pms,
      title: `Schedule v${summary.version_no} uploaded`,
      body: changeSummaryLine(summary),
      payload: { ...summary, first_upload: false },
    });
  }

  // Every upload reports what is overdue, so the PM can decide what to raise as a risk.
  if (summary.overdue_task_count > 0) {
    await notify({
      ...entity,
      typeCode: 'task_overdue_risk',
      recipientIds: pms,
      title: `${summary.overdue_task_count} overdue ${plural(summary.overdue_task_count, 'task', 'tasks')}`,
      body: `${projectName}: ${summary.overdue_task_count} ${plural(summary.overdue_task_count, 'task is', 'tasks are')} past the expected finish in schedule v${summary.version_no}. Review them on the schedule's Overdue tab.`,
      payload: { count: summary.overdue_task_count, version_no: summary.version_no },
    });
  }

  if (summary.pct_overwrites > 0) {
    await notify({
      ...entity,
      typeCode: 'reconciliation_flag_raised',
      recipientIds: pms,
      title: `${summary.pct_overwrites} site ${plural(summary.pct_overwrites, 'update', 'updates')} overwritten`,
      body: `Schedule v${summary.version_no} replaced progress reported from site on ${summary.pct_overwrites} ${plural(summary.pct_overwrites, 'task', 'tasks')}. Review and acknowledge.`,
      payload: { count: summary.pct_overwrites, version_no: summary.version_no },
    });
  }
}

function changeSummaryLine(summary: ApplySummary): string {
  const parts = [
    `${summary.tasks_added} added`,
    `${summary.tasks_modified} changed`,
    `${summary.tasks_removed} removed`,
  ];
  return parts.join(', ') + '.';
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? one : many;
}
