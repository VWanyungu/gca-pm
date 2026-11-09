import { randomUUID } from 'crypto';
import db from '../../database/dbSetup.js';
import { Dprs } from '../../database/utils/database.js';
import type { DprSyncPayload, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleDprSync(envelope: QStashEventEnvelope<DprSyncPayload>) {
  const project = await resolveProject(envelope.project);
  const data = envelope.data;

  // Determine stage_no: default to 7 (Construction) if not specified
  const stageNo = data.stage_no ?? 7;

  // Check if a DPR already exists for this project and report_date
  const existingDpr = await db('dpr')
    .where({ project_id: project.project_id, report_date: data.report_date })
    .first();

  const isSubmitting = data.auto_submit ?? true;

  if (existingDpr) {
    // If existing DPR is still draft, update it
    if (existingDpr.status === 'draft') {
      const updated = await Dprs.update(existingDpr.dpr_id, {
        site_location: data.site_location ?? existingDpr.site_location,
        contract_no: data.contract_no ?? existingDpr.contract_no,
        weather_category_id: data.weather?.weather_category_id ?? existingDpr.weather_category_id,
        temp_min_c: data.weather?.temp_min_c ?? existingDpr.temp_min_c,
        temp_max_c: data.weather?.temp_max_c ?? existingDpr.temp_max_c,
        humidity_pct: data.weather?.humidity_pct ?? existingDpr.humidity_pct,
        wind: data.weather?.wind ?? existingDpr.wind,
        equipment_text: data.equipment_text ?? existingDpr.equipment_text,
        visitors_text: data.visitors_text ?? existingDpr.visitors_text,
        delays_text: data.delays_text ?? existingDpr.delays_text,
      });

      if (isSubmitting) {
        await db('dpr').where({ dpr_id: existingDpr.dpr_id }).update({
          status: 'submitted',
          submitted_at: new Date(),
          submitted_by: SYSTEM_ACTOR_ID,
        });
      }

      await db('audit_event').insert({
        occurred_at: new Date(),
        actor_id: SYSTEM_ACTOR_ID,
        channel: 'qstash_webhook',
        correlation_id: envelope.event_id,
        project_id: project.project_id,
        entity_type: 'dpr',
        entity_id: existingDpr.dpr_id,
        action: isSubmitting ? 'dpr.submit' : 'dpr.update',
        before_json: JSON.stringify(existingDpr),
        after_json: JSON.stringify(updated ?? {}),
        reason: 'Synced from sister system via QStash',
      });

      return { dpr_id: existingDpr.dpr_id, action: 'updated', status: isSubmitting ? 'submitted' : 'draft' };
    }

    // Existing DPR is already submitted
    return {
      dpr_id: existingDpr.dpr_id,
      action: 'already_submitted',
      message: `DPR for date ${data.report_date} is already submitted.`,
    };
  }

  // Create new DPR
  const createdDpr = await Dprs.create({
    project_id: project.project_id,
    stage_no: stageNo,
    report_date: data.report_date,
    site_location: data.site_location || project.site_location || 'Project Site',
    contract_no: data.contract_no || null,
    weather_category_id: data.weather?.weather_category_id || null,
    temp_min_c: data.weather?.temp_min_c || null,
    temp_max_c: data.weather?.temp_max_c || null,
    humidity_pct: data.weather?.humidity_pct || null,
    wind: data.weather?.wind || null,
    equipment_text: data.equipment_text || null,
    visitors_text: data.visitors_text || null,
    delays_text: data.delays_text || null,
    status: isSubmitting ? 'submitted' : 'draft',
    author_id: SYSTEM_ACTOR_ID,
  });

  // Audit event
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: envelope.event_id,
    project_id: project.project_id,
    entity_type: 'dpr',
    entity_id: createdDpr.dpr_id,
    action: isSubmitting ? 'dpr.submit' : 'dpr.create',
    after_json: JSON.stringify(createdDpr),
    reason: 'Synced from sister system via QStash',
  });

  return { dpr_id: createdDpr.dpr_id, action: 'created', status: createdDpr.status };
}
