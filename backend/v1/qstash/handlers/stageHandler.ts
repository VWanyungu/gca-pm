import db from '../../database/dbSetup.js';
import { ProjectStages, StageActivities, StageActivityAttachments } from '../../database/utils/database.js';
import type { StageSyncPayload, StageUpdateItem, StageActivitySyncItem, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleStageSync(envelope: QStashEventEnvelope<StageSyncPayload>) {
  const project = await resolveProject(envelope.project);
  const results: Record<string, any> = {};
  if (envelope.data.stages?.length) {
    results.stages = await applyProjectStages(project.project_id, envelope.data.stages, envelope.event_id);
  }
  if (envelope.data.activities?.length) {
    results.activities = await applyStageActivities(project.project_id, envelope.data.activities, envelope.event_id);
  }
  return results;
}

export async function applyProjectStages(
  projectId: string,
  stages: StageUpdateItem[],
  correlationId: string,
) {
  const results: any[] = [];

  for (const item of stages) {
    const existing = await ProjectStages.get(projectId, item.stage_no);

    // AC-STG-12: Kickoff/Closure complete themselves once every gate activity is
    // done (see applyStageActivities) — no direct "set complete" for them.
    if (existing && item.state === 'complete' && existing.kind !== 'pdm') {
      results.push({
        stage_no: item.stage_no,
        error: 'Kickoff/Closure stages complete automatically once every activity is done',
      });
      continue;
    }

    if (existing) {
      const transitioned = await ProjectStages.transition({
        projectId,
        stageNo: item.stage_no,
        toState: item.state,
        inScope: item.in_scope,
        actorId: SYSTEM_ACTOR_ID,
        reason: item.reason ?? 'Updated via QStash sync',
        closureNotes: item.closure_notes,
      });
      results.push({
        stage_no: item.stage_no,
        state: transitioned.stage.state,
        in_scope: transitioned.stage.in_scope,
        action: 'transitioned',
      });
    } else {
      const created = await ProjectStages.create({
        projectId,
        stageNo: item.stage_no,
        state: item.state ?? 'not_started',
        inScope: item.in_scope ?? true,
        actorId: SYSTEM_ACTOR_ID,
        reason: item.reason ?? 'Added to scope via QStash sync',
      });
      results.push({
        stage_no: item.stage_no,
        state: created.state,
        in_scope: created.in_scope,
        action: 'created',
      });
    }
  }

  // Audit
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'project_stage',
    entity_id: projectId,
    action: 'stages.sync',
    after_json: JSON.stringify(stages),
    reason: 'Stages updated via QStash sync',
  });

  return results;
}

/**
 * Kickoff/Closure gate-activity checklist items. Reuses the same model + auto-complete
 * path as PATCH /stageActivities/:id (AC-STG-12/13) so the webhook can't do anything the
 * authenticated API itself can't.
 */
export async function applyStageActivities(
  projectId: string,
  activities: StageActivitySyncItem[],
  correlationId: string,
) {
  const results: any[] = [];

  for (const item of activities) {
    const existing = await StageActivities.getById(projectId, item.activity_id);
    if (!existing) {
      results.push({ activity_id: item.activity_id, error: 'Stage activity not found' });
      continue;
    }

    if (item.status === 'done' && existing.requires_attachment) {
      const attachments = await StageActivityAttachments.list({ activityId: item.activity_id });
      if (attachments.length === 0) {
        results.push({
          activity_id: item.activity_id,
          error: 'This activity requires at least one attachment before it can be marked done',
        });
        continue;
      }
    }

    // Enforce DB constraint ck_activity_completed_at: (status = 'done') = (completed_at IS NOT NULL)
    const patch = { status: item.status, completed_at: item.status === 'done' ? new Date() : null };
    const { activity, completedStage } = await StageActivities.updateAndAutoComplete(
      projectId,
      item.activity_id,
      patch,
      SYSTEM_ACTOR_ID,
    );
    results.push({
      activity_id: item.activity_id,
      status: activity?.status,
      completed_stage: completedStage?.stage_no ?? null,
    });
  }

  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'stage_activity',
    entity_id: projectId,
    action: 'activities.sync',
    after_json: JSON.stringify(activities),
    reason: 'Gate activities updated via QStash sync',
  });

  return results;
}

