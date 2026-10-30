import type { Knex } from 'knex';
import { PLANNED_I_EXPR } from '../database/utils/database.js';

/**
 * Overdue tasks (AC-SCH-20, AC-SCH-23) and the metrics snapshot (AC-SCH-30 to AC-SCH-34).
 *
 * Both run inside the upload's transaction (AC-SCH-10, AC-SCH-11) and both are written to be
 * callable on their own, because the nightly overdue sweep and the metrics job need exactly
 * the same logic against the stored schedule.
 *
 * Note on AC-SCH-21: an upload no longer raises risks for overdue tasks. The PM raises them
 * from the Overdue tab, so a risk exists because someone decided it should.
 *
 * Every date comparison is made in the project's timezone (AC-GEN-06): "overdue" and "today"
 * are local calendar questions, and a server in UTC would answer them hours early or late.
 */

/** BR-05. Configuration rather than literals, so OQ-FN-01 can move them without a code change. */
export const RAG_THRESHOLDS = {
  green: Number(process.env.RAG_GREEN_MIN ?? 0.95),
  amber: Number(process.env.RAG_AMBER_MIN ?? 0.8),
};

/** AC-SCH-20. A task is overdue when its current revision is past due and unfinished.
 *  Summary rows never qualify, and neither do tasks the planner deactivated. */
const OVERDUE_PREDICATE = `
  t.removed_in_version_id IS NULL
  AND r.is_summary = false
  AND r.is_active = true
  AND r.pct_work_complete < 100
  AND (r.expected_finish AT TIME ZONE :tz)::date < (now() AT TIME ZONE :tz)::date
`;

/**
 * How many tasks are overdue right now. An upload records this against its version and tells
 * the PM; it does not raise anything. Overdue tasks are listed on the schedule's Overdue tab,
 * where the PM decides which of them are worth tracking as a risk.
 */
export async function countOverdueTasks(
  trx: Knex.Transaction,
  projectId: string,
  timezone: string,
): Promise<number> {
  const { rows } = await trx.raw(
    `
    SELECT count(*)::int AS overdue
    FROM schedule_task t
    JOIN schedule_task_revision r ON r.task_id = t.task_id AND r.valid_to IS NULL
    WHERE t.project_id = :projectId
      AND ${OVERDUE_PREDICATE}
    `,
    { projectId, tz: timezone },
  );
  return rows[0]?.overdue ?? 0;
}

/**
 * AC-SCH-23. Closes still-open risks raised from a schedule task once that task has stopped
 * being overdue, recording which of the three ways it stopped. The PM raised these by hand,
 * but the reason they exist has gone, so closing them saves the PM tidying up after the
 * schedule. Risks they have already acted on, and risks not tied to a task, are untouched.
 */
export async function autoResolveOverdueRisks(
  trx: Knex.Transaction,
  projectId: string,
  timezone: string,
): Promise<number> {
  const { rows } = await trx.raw(
    `
    SELECT k.risk_id,
           t.removed_in_version_id,
           r.revision_id,
           r.pct_work_complete,
           -- NULL when the task has no current revision at all, which the caller reads as
           -- "not overdue any more" and resolves as task_removed.
           (${OVERDUE_PREDICATE}) AS still_overdue
    FROM risk k
    JOIN schedule_task t ON t.task_id = k.source_task_id
    LEFT JOIN schedule_task_revision r ON r.task_id = t.task_id AND r.valid_to IS NULL
    WHERE k.project_id = :projectId
      AND k.source = 'overdue_task'
      AND k.status = 'open'
    `,
    { projectId, tz: timezone },
  );

  const resolutions = rows
    .filter((row: { still_overdue: boolean | null }) => row.still_overdue !== true)
    .map((row: { risk_id: string; removed_in_version_id: string | null; revision_id: string | null; pct_work_complete: string | null }) => ({
      risk_id: row.risk_id,
      reason:
        row.removed_in_version_id || !row.revision_id
          ? 'task_removed'
          : Number(row.pct_work_complete) >= 100
            ? 'task_completed'
            : 'rescheduled',
    }));

  for (const resolution of resolutions) {
    await trx('risk').where({ risk_id: resolution.risk_id }).update({
      status: 'closed',
      auto_resolution_reason: resolution.reason,
      closed_at: trx.fn.now(),
    });
  }

  return resolutions.length;
}

export interface MetricsSnapshot {
  as_of_date: string;
  planned_pct: number;
  actual_pct: number;
  spi: number | null;
  rag: 'green' | 'amber' | 'red' | null;
  baseline_finish: string | null;
  forecast_finish: string | null;
}

/**
 * AC-SCH-30 to AC-SCH-34. Upserts today's snapshot from the stored schedule.
 *
 * Weighted by duration (AC-SCH-31), so milestones contribute nothing — they have zero
 * duration. Planned % is recomputed from the planned window rather than read from the file's
 * own planned_pct_complete, which AC-SCH-32 explicitly rules out.
 */
export async function refreshProjectMetrics(
  trx: Knex.Transaction,
  projectId: string,
  versionId: string,
  timezone: string,
): Promise<MetricsSnapshot | null> {
  const { rows } = await trx.raw(
    `
    WITH qualifying AS (
      SELECT r.duration_minutes::numeric            AS weight,
             r.pct_work_complete                    AS actual_i,
             ${PLANNED_I_EXPR}                      AS planned_i,
             r.baseline_start,
             r.baseline_finish,
             r.start,
             r.expected_finish
      FROM schedule_task t
      JOIN schedule_task_revision r ON r.task_id = t.task_id AND r.valid_to IS NULL
      WHERE t.project_id = :projectId
        AND t.removed_in_version_id IS NULL
        AND r.is_summary = false
        AND r.is_active = true
    )
    SELECT (now() AT TIME ZONE :tz)::date                            AS as_of_date,
           COALESCE(SUM(weight), 0)                                  AS weight_total,
           SUM(weight * actual_i)                                    AS actual_weighted,
           SUM(weight * planned_i)                                   AS planned_weighted,
           (MAX(baseline_finish) AT TIME ZONE :tz)::date             AS baseline_finish,
           (MAX(expected_finish) AT TIME ZONE :tz)::date             AS forecast_finish,
           (MIN(COALESCE(baseline_start, start)) AT TIME ZONE :tz)::date   AS project_start,
           (MAX(COALESCE(baseline_finish, expected_finish)) AT TIME ZONE :tz)::date AS project_planned_finish
    FROM qualifying
    `,
    { projectId, tz: timezone },
  );

  const row = rows[0];
  const weightTotal = Number(row?.weight_total ?? 0);

  // AC-SCH-32 says both percentages are null when the weights sum to zero, but the snapshot
  // columns are NOT NULL, so there is no row that can say that. Writing no snapshot is the
  // only honest option; the project reads as "no schedule" until a task has a duration.
  if (!row || weightTotal === 0) {
    return null;
  }

  const round2 = (value: number) => Math.round(value * 100) / 100;
  const actual = round2(Number(row.actual_weighted) / weightTotal);
  const planned = round2(Number(row.planned_weighted) / weightTotal);
  const spi = planned > 0 ? round2(actual / planned) : null;
  const rag = ragFor(spi);

  const asOfDate = toDateString(row.as_of_date);
  const snapshot: MetricsSnapshot = {
    as_of_date: asOfDate,
    planned_pct: planned,
    actual_pct: actual,
    spi,
    rag,
    baseline_finish: row.baseline_finish ? toDateString(row.baseline_finish) : null,
    forecast_finish: row.forecast_finish ? toDateString(row.forecast_finish) : null,
  };

  await trx('project_metrics_snapshot')
    .insert({
      project_id: projectId,
      as_of_date: snapshot.as_of_date,
      schedule_version_id: versionId,
      planned_pct: snapshot.planned_pct,
      actual_pct: snapshot.actual_pct,
      spi: snapshot.spi,
      rag: snapshot.rag,
      baseline_finish: snapshot.baseline_finish,
      forecast_finish: snapshot.forecast_finish,
      computed_at: trx.fn.now(),
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

  // A schedule upload overwrites the project's own start/planned-end dates from the uploaded
  // plan, same as it overwrites progress — `start`/`expected_finish` are NOT NULL on every
  // qualifying revision, so these are always present once weightTotal > 0.
  await trx('projects').where({ project_id: projectId }).update({
    expected_start_date: toDateString(row.project_start),
    expected_end_date: toDateString(row.project_planned_finish),
    updated_at: trx.fn.now(),
  });

  return snapshot;
}

/** BR-05. Null SPI means no RAG at all: the snapshot's ck_pms_spi_rag_pair keeps them paired. */
export function ragFor(spi: number | null): 'green' | 'amber' | 'red' | null {
  if (spi === null) return null;
  if (spi >= RAG_THRESHOLDS.green) return 'green';
  if (spi >= RAG_THRESHOLDS.amber) return 'amber';
  return 'red';
}

/** pg returns a `date` as a Date at local midnight; toISOString would shift it a day. */
function toDateString(value: Date | string): string {
  if (typeof value === 'string') {
    return value.slice(0, 10);
  }
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${value.getFullYear()}-${month}-${day}`;
}

export const __testing = { toDateString };
