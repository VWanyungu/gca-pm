import { randomUUID } from 'crypto';
import db from '../../database/dbSetup.js';
import { WeeklySubmissions } from '../../database/utils/database.js';
import type { WeeklySyncPayload, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleWeeklySync(envelope: QStashEventEnvelope<WeeklySyncPayload>) {
  const project = await resolveProject(envelope.project);
  const data = envelope.data;

  // Check if a weekly submission already exists for this week_start
  const existing = await db('weekly_submission')
    .where({ project_id: project.project_id, week_start: data.week_start })
    .orderBy('revision_no', 'desc')
    .first();

  let submissionId = existing?.submission_id;

  if (existing) {
    if (existing.status === 'draft') {
      // Update draft
      const updateResult = await WeeklySubmissions.update(
        existing.submission_id,
        {
          pm_commentary: data.pm_commentary ?? existing.pm_commentary,
          top_risk_text: data.top_risk_text ?? existing.top_risk_text,
          top_action: data.top_action ?? existing.top_action,
          top_risk_id: data.top_risk_id ?? existing.top_risk_id,
          active_stages: data.active_stages ?? existing.active_stages,
          scope_change_text: data.scope_change_text ?? existing.scope_change_text,
          escalate: data.escalate ?? existing.escalate,
          escalation_reason: data.escalation_reason ?? existing.escalation_reason,
        },
        SYSTEM_ACTOR_ID,
        project.project_id,
      );

      submissionId = updateResult.submission?.submission_id ?? existing.submission_id;
    } else {
      // It's already approved.
      return {
        submission_id: existing.submission_id,
        action: 'already_approved',
        message: `Weekly submission for week ${data.week_start} is already approved (Revision ${existing.revision_no}).`,
      };
    }
  } else {
    // Create new draft
    const created = await WeeklySubmissions.create({
      project_id: project.project_id,
      week_start: data.week_start,
      pm_commentary: data.pm_commentary ?? 'Weekly progress report',
      top_risk_text: data.top_risk_text ?? 'No critical risk identified',
      top_action: data.top_action ?? 'Continue scheduled works',
      top_risk_id: data.top_risk_id ?? null,
      active_stages: data.active_stages ?? [7],
      scope_change_text: data.scope_change_text ?? 'No scope change',
      escalate: data.escalate ?? false,
      escalation_reason: data.escalation_reason ?? null,
      created_by: SYSTEM_ACTOR_ID,
    });
    submissionId = created.submission_id;
  }

  // If auto_approve requested
  if (data.auto_approve && submissionId) {
    const approveResult = await WeeklySubmissions.approve(
      submissionId,
      { approved_by: SYSTEM_ACTOR_ID },
      project.project_id,
    );

    if (approveResult.validationErrors && approveResult.validationErrors.length > 0) {
      return {
        submission_id: submissionId,
        action: 'saved_as_draft',
        message: `Saved as draft. Approval validation failed: ${approveResult.validationErrors.join(', ')}`,
      };
    }
  }

  // Audit event
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: envelope.event_id,
    project_id: project.project_id,
    entity_type: 'weekly_submission',
    entity_id: submissionId,
    action: data.auto_approve ? 'weekly_submission.approve' : 'weekly_submission.update',
    after_json: JSON.stringify(data),
    reason: 'Synced from sister system via QStash',
  });

  return {
    submission_id: submissionId,
    action: data.auto_approve ? 'approved' : 'draft_saved',
    week_start: data.week_start,
  };
}
