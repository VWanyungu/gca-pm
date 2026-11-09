import { randomUUID } from 'crypto';
import db from '../../database/dbSetup.js';
import { RiskIssues, RiskCategories } from '../../database/utils/database.js';
import type { RiskSyncPayload, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleRiskSync(envelope: QStashEventEnvelope<RiskSyncPayload>) {
  const project = await resolveProject(envelope.project);
  const data = envelope.data;

  // Resolve category_id
  let categoryId = data.category_id;
  if (!categoryId && data.category_code) {
    const cat = await RiskCategories.getByCode(data.category_code);
    if (cat) categoryId = cat.risk_category_id;
  }
  if (!categoryId) {
    const { categories } = await RiskCategories.list({ includeInactive: false });
    categoryId = categories[0]?.risk_category_id ?? 1;
  }

  const likelihood = Math.min(5, Math.max(1, data.likelihood ?? 3));
  const impact = Math.min(5, Math.max(1, data.impact ?? 3));
  const score = likelihood * impact;
  const status = data.status ?? 'open';
  const kind = data.kind ?? 'risk';

  // Check if risk already exists (by risk_id or title match)
  let existing = null;
  if (data.risk_id) {
    existing = await db('risk')
      .where({ project_id: project.project_id, risk_id: data.risk_id })
      .first();
  }
  if (!existing && data.title) {
    existing = await db('risk')
      .where({ project_id: project.project_id, title: data.title })
      .first();
  }

  let riskId: string;
  let action: string;

  if (existing) {
    riskId = existing.risk_id;
    action = 'risk.update';

    const patch: any = {
      title: data.title,
      description: data.description ?? existing.description,
      category_id: categoryId,
      likelihood,
      impact,
      score,
      status,
      mitigation_plan: data.mitigation_plan ?? existing.mitigation_plan,
      stage_no: data.stage_no ?? existing.stage_no,
      updated_at: new Date(),
    };

    if (status === 'closed' && existing.status !== 'closed') {
      patch.closed_at = new Date();
    } else if (status === 'open' && existing.status === 'closed') {
      patch.closed_at = null;
    }

    await db('risk').where({ risk_id: riskId }).update(patch);
  } else {
    riskId = data.risk_id ?? randomUUID();
    action = 'risk.create';

    await db('risk').insert({
      risk_id: riskId,
      project_id: project.project_id,
      kind,
      source: 'manual',
      title: data.title,
      description: data.description ?? null,
      category_id: categoryId,
      likelihood,
      impact,
      score,
      status,
      mitigation_plan: data.mitigation_plan ?? null,
      stage_no: data.stage_no ?? null,
      owner_id: data.owner_id ?? SYSTEM_ACTOR_ID,
      created_by: SYSTEM_ACTOR_ID,
      opened_at: new Date(),
      closed_at: status === 'closed' ? new Date() : null,
    });
  }

  // Audit event
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: envelope.event_id,
    project_id: project.project_id,
    entity_type: 'risk',
    entity_id: riskId,
    action,
    after_json: JSON.stringify({ riskId, title: data.title, status, score }),
    reason: 'Synced from sister system via QStash',
  });

  return { risk_id: riskId, action, status, score };
}
