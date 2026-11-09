import db from '../../database/dbSetup.js';
import { seedInitialScheduleSummary } from '../../utils/scheduleProcessor.js';
import type { MetricsSyncPayload, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleMetricsSync(envelope: QStashEventEnvelope<MetricsSyncPayload>) {
  const project = await resolveProject(envelope.project);
  return await applyProjectMetrics(project.project_id, envelope.data, envelope.event_id, project);
}

export async function applyProjectMetrics(
  projectId: string,
  metrics: MetricsSyncPayload,
  correlationId: string,
  projectData?: { name?: string; expected_start_date?: string | null; expected_end_date?: string | null },
) {
  const asOfDate = metrics.as_of_date || new Date().toISOString().slice(0, 10);
  const actualPct = Number(metrics.actual_pct);

  // 1. Ensure a valid schedule_version_id exists for the FK
  let version = await db('schedule_version')
    .where({ project_id: projectId, status: 'applied' })
    .whereNull('deleted_at')
    .orderBy('version_no', 'desc')
    .first('schedule_version_id');

  if (!version) {
    version = await db('schedule_version')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc')
      .first('schedule_version_id');
  }

  if (!version) {
    // Seed initial schedule summary to satisfy FK
    await seedInitialScheduleSummary(
      {
        project_id: projectId,
        name: projectData?.name || 'Project Schedule',
        expected_start_date: projectData?.expected_start_date ?? null,
        expected_end_date: projectData?.expected_end_date ?? null,
      },
      SYSTEM_ACTOR_ID,
    );

    version = await db('schedule_version')
      .where({ project_id: projectId })
      .orderBy('created_at', 'desc')
      .first('schedule_version_id');
  }

  const scheduleVersionId = version?.schedule_version_id;
  if (!scheduleVersionId) {
    throw new Error(`Unable to resolve or create schedule version for project ${projectId}`);
  }

  // 2. Derive Planned %, SPI and RAG
  const existingSnapshot = await db('project_metrics_snapshot')
    .where({ project_id: projectId, as_of_date: asOfDate })
    .first();

  const plannedPct =
    metrics.planned_pct !== undefined
      ? Number(metrics.planned_pct)
      : existingSnapshot?.planned_pct !== undefined
        ? Number(existingSnapshot.planned_pct)
        : 0;

  let spi = metrics.spi !== undefined ? metrics.spi : null;
  let rag = metrics.rag;

  if (spi === null && plannedPct > 0) {
    spi = Number((actualPct / plannedPct).toFixed(2));
  }

  // AC-SCH-33 & BR-05 thresholds: >= 0.95 green, >= 0.80 amber, else red
  if (!rag && spi !== null) {
    if (spi >= 0.95) rag = 'green';
    else if (spi >= 0.80) rag = 'amber';
    else rag = 'red';
  }

  // Ensure ck_pms_spi_rag_pair check constraint: (spi IS NULL) = (rag IS NULL)
  if (spi === null) {
    rag = undefined;
  } else if (!rag) {
    rag = 'green';
  }

  // 3. Upsert snapshot
  const rowData: Record<string, any> = {
    project_id: projectId,
    as_of_date: asOfDate,
    schedule_version_id: scheduleVersionId,
    actual_pct: actualPct,
    planned_pct: plannedPct,
    spi: spi ?? null,
    rag: rag ?? null,
    computed_at: new Date(),
  };

  if (metrics.forecast_finish) rowData.forecast_finish = metrics.forecast_finish;
  if (metrics.baseline_finish) rowData.baseline_finish = metrics.baseline_finish;

  await db('project_metrics_snapshot')
    .insert(rowData)
    .onConflict(['project_id', 'as_of_date'])
    .merge({
      actual_pct: actualPct,
      planned_pct: plannedPct,
      spi: spi ?? null,
      rag: rag ?? null,
      forecast_finish: metrics.forecast_finish ?? existingSnapshot?.forecast_finish ?? null,
      computed_at: new Date(),
    });

  // Also update top-level schedule_task_revision if any exists so metrics stay consistent
  const topTask = await db('schedule_task')
    .where({ project_id: projectId, outline_level: 1 })
    .whereNull('removed_in_version_id')
    .first();

  if (topTask) {
    await db('schedule_task_revision')
      .where({ task_id: topTask.task_id })
      .whereNull('valid_to')
      .update({
        pct_work_complete: actualPct,
        planned_pct_complete: plannedPct,
      });
  }

  // 4. Audit
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'project_metrics',
    entity_id: `${projectId}:${asOfDate}`,
    action: 'metrics.update',
    after_json: JSON.stringify({ actualPct, plannedPct, spi, rag, asOfDate }),
    reason: 'Updated via QStash sync',
  });

  return {
    as_of_date: asOfDate,
    actual_pct: actualPct,
    planned_pct: plannedPct,
    spi,
    rag,
  };
}
