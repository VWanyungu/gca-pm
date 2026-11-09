import { randomUUID } from 'crypto';
import db from '../../database/dbSetup.js';
import { CustomMilestones } from '../../database/utils/database.js';
import type {
  MilestoneSyncPayload,
  CustomMilestoneSyncItem,
  QStashEventEnvelope,
} from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleMilestoneSync(envelope: QStashEventEnvelope<MilestoneSyncPayload>) {
  const project = await resolveProject(envelope.project);
  return await applyProjectMilestones(project.project_id, envelope.data.milestones, envelope.event_id);
}

export async function applyProjectMilestones(
  projectId: string,
  milestones: CustomMilestoneSyncItem[],
  correlationId: string,
) {
  const results: any[] = [];

  for (const m of milestones) {
    let existing = null;
    if (m.milestone_id) {
      existing = await db('custom_milestones')
        .where({ project_id: projectId, milestone_id: m.milestone_id })
        .whereNull('removed_at')
        .first();
    }
    if (!existing && m.title) {
      existing = await db('custom_milestones')
        .where({ project_id: projectId, title: m.title })
        .whereNull('removed_at')
        .first();
    }

    if (existing) {
      const updated = await CustomMilestones.update(existing.milestone_id, {
        title: m.title,
        stage_no: m.stage_no !== undefined ? m.stage_no : existing.stage_no,
        planned_date: m.planned_date || existing.planned_date,
        forecast_date: m.forecast_date ?? existing.forecast_date,
        actual_date: m.actual_date ?? existing.actual_date,
        notes: m.notes ?? existing.notes,
        updated_by: SYSTEM_ACTOR_ID,
      });
      results.push({ milestone_id: existing.milestone_id, action: 'updated' });
    } else {
      const created = await CustomMilestones.create({
        project_id: projectId,
        stage_no: m.stage_no ?? null,
        title: m.title,
        planned_date: m.planned_date,
        forecast_date: m.forecast_date ?? null,
        actual_date: m.actual_date ?? null,
        notes: m.notes ?? null,
        created_by: SYSTEM_ACTOR_ID,
        updated_by: SYSTEM_ACTOR_ID,
      });
      results.push({ milestone_id: created.milestone_id, action: 'created' });
    }
  }

  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'custom_milestones',
    entity_id: projectId,
    action: 'milestones.sync',
    after_json: JSON.stringify(milestones),
    reason: 'Milestones synced via QStash',
  });

  return results;
}

