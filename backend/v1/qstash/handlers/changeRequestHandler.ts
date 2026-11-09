import { randomUUID } from 'crypto';
import db from '../../database/dbSetup.js';
import { ChangeRequests } from '../../database/utils/database.js';
import type { ChangeRequestSyncPayload, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleChangeRequestSync(
  envelope: QStashEventEnvelope<ChangeRequestSyncPayload>,
) {
  const project = await resolveProject(envelope.project);
  const data = envelope.data;

  // Check if CR already exists
  let existing = null;
  if (data.change_id) {
    existing = await db('change_request')
      .where({ project_id: project.project_id, change_id: data.change_id })
      .first();
  }
  if (!existing && data.title) {
    existing = await db('change_request')
      .where({ project_id: project.project_id, title: data.title })
      .first();
  }

  let changeId: string;
  let action: string;

  if (existing) {
    changeId = existing.change_id;
    action = 'change_request.update';

    await db('change_request')
      .where({ change_id: changeId })
      .update({
        title: data.title,
        scope_description: data.scope_description ?? existing.scope_description,
        reason: data.reason ?? existing.reason,
        supporting_notes: data.supporting_notes ?? existing.supporting_notes,
        cost_impact: data.cost_impact ?? existing.cost_impact,
        cost_currency: data.cost_currency ?? existing.cost_currency,
        schedule_impact_days: data.schedule_impact_days ?? existing.schedule_impact_days,
        stage_no: data.stage_no ?? existing.stage_no,
        status: data.status ?? existing.status,
        updated_at: new Date(),
      });
  } else {
    action = 'change_request.create';
    const created = await ChangeRequests.create({
      project_id: project.project_id,
      stage_no: data.stage_no ?? 7,
      type: 'scope',
      title: data.title,
      scope_description: data.scope_description ?? 'Scope modification requested via sister system sync',
      reason: data.reason ?? 'Operational synchronization',
      supporting_notes: data.supporting_notes ?? null,
      cost_impact: data.cost_impact ?? null,
      cost_currency: data.cost_currency ?? 'USD',
      schedule_impact_days: data.schedule_impact_days ?? null,
      raised_by: SYSTEM_ACTOR_ID,
    });
    changeId = created.change_id;
  }

  // Audit event
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: envelope.event_id,
    project_id: project.project_id,
    entity_type: 'change_request',
    entity_id: changeId,
    action,
    after_json: JSON.stringify(data),
    reason: 'Synced from sister system via QStash',
  });

  return { change_id: changeId, action };
}
