import { randomUUID } from 'crypto';
import { refreshProjectMetrics } from './scheduleRisks.js';
/**
 * AC-SCH-15 to AC-SCH-17. For each of this DPR's activity-progress rows tied to a schedule
 * task, closes that task's current revision and inserts a copy with `pct_work_complete` set
 * to the DPR's `total_pct`, `source = 'dpr_writeback'`. Tasks whose % did not change are left
 * untouched, and so is any task whose current revision is a summary row or no longer current
 * (AC-DPR-06 already keeps the DPR task picker to current, non-summary tasks).
 *
 * Runs inside the caller's transaction, under the same per-project advisory lock a schedule
 * upload takes, so a write-back and an upload can never race on the same task.
 */
export async function writebackDprActivityProgress(trx, { dprId, projectId, dprSubmittedAt, timezone, enforceStaleRule }) {
    await trx.raw('SELECT pg_advisory_xact_lock(hashtext(?))', [projectId]);
    if (enforceStaleRule) {
        const laterUpload = await trx('schedule_version')
            .where({ project_id: projectId, status: 'applied' })
            .andWhere('applied_at', '>', dprSubmittedAt)
            .first('schedule_version_id');
        if (laterUpload) {
            return { written: 0 };
        }
    }
    const activityRows = await trx('dpr_activity_progress')
        .where({ dpr_id: dprId, source: 'schedule_task' })
        .whereNull('removed_at')
        .whereNotNull('task_id')
        .select('dpr_activity_progress_id', 'task_id', 'total_pct');
    if (activityRows.length === 0) {
        return { written: 0 };
    }
    const taskIds = activityRows.map((r) => r.task_id);
    const currentRevisions = await trx('schedule_task_revision')
        .whereIn('task_id', taskIds)
        .whereNull('valid_to')
        .forUpdate()
        .select('*');
    const currentByTaskId = new Map(currentRevisions.map((r) => [r.task_id, r]));
    const appliedAt = new Date();
    const toClose = [];
    const toInsert = [];
    for (const row of activityRows) {
        const current = currentByTaskId.get(row.task_id);
        if (!current || current.is_summary)
            continue; // task removed, or not a leaf task
        if (Number(current.pct_work_complete) === Number(row.total_pct))
            continue; // AC-SCH-15: unchanged, write nothing
        const revisionId = randomUUID();
        toClose.push(current.revision_id);
        toInsert.push({
            revision_id: revisionId,
            task_id: row.task_id,
            schedule_version_id: current.schedule_version_id,
            source: 'dpr_writeback',
            dpr_activity_progress_id: row.dpr_activity_progress_id,
            change_type: 'modified',
            valid_from: appliedAt,
            valid_to: null,
            parent_task_id: current.parent_task_id,
            outline_level: current.outline_level,
            wbs: current.wbs,
            task_name: current.task_name,
            duration_minutes: current.duration_minutes,
            baseline_start: current.baseline_start,
            baseline_finish: current.baseline_finish,
            start: current.start,
            expected_finish: current.expected_finish,
            actual_start: current.actual_start,
            actual_finish: current.actual_finish,
            pct_work_complete: row.total_pct,
            planned_pct_complete: current.planned_pct_complete,
            is_milestone: current.is_milestone,
            is_summary: current.is_summary,
            is_critical: current.is_critical,
            task_type: current.task_type,
            predecessors: JSON.stringify(current.predecessors),
            resource_names: current.resource_names,
            responsible_user_id: current.responsible_user_id,
        });
    }
    if (toClose.length) {
        await trx('schedule_task_revision').whereIn('revision_id', toClose).update({ valid_to: appliedAt });
    }
    if (toInsert.length) {
        await trx('schedule_task_revision').insert(toInsert);
        // AC-SCH-17: a write-back refreshes today's metrics too, onto the schedule's current version.
        const version = currentRevisions[0]?.schedule_version_id;
        if (version) {
            await refreshProjectMetrics(trx, projectId, version, timezone);
        }
    }
    return { written: toInsert.length };
}
