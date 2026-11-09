import db from '../../database/dbSetup.js';
import { ClientFeedbackRequests, Projects, feedbackRequestStatus } from '../../database/utils/database.js';
import type { ClientFeedbackSyncPayload, ClientFeedbackSyncItem, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleClientFeedbackSync(envelope: QStashEventEnvelope<ClientFeedbackSyncPayload>) {
  const project = await resolveProject(envelope.project);
  return await applyClientFeedback(project.project_id, envelope.data.feedback, envelope.event_id);
}

export async function applyClientFeedback(
  projectId: string,
  feedback: ClientFeedbackSyncItem[],
  correlationId: string,
) {
  const results: any[] = [];

  for (const item of feedback) {
    let requestId = item.request_id;
    let action: string | null = null;

    if (!requestId) {
      let contactId = item.contact_id;
      if (!contactId && item.contact_email) {
        const contact = await db('client_contacts')
          .where({ project_id: projectId, email: item.contact_email })
          .first();
        contactId = contact?.contact_id;
      }
      if (!contactId) {
        results.push({
          error: 'contact_id or contact_email (matching an existing client contact) is required to create a feedback request',
        });
        continue;
      }

      const about =
        item.about ?? (await Projects.currentStageByProjectId([projectId])).get(projectId)?.stage_name ?? 'Whole project';
      const [created] = await ClientFeedbackRequests.create({
        project_id: projectId,
        contact_ids: [contactId],
        requested_by: SYSTEM_ACTOR_ID,
        about,
        expires_in_days: item.expires_in_days ?? 14,
      });
      if (!created) {
        results.push({ error: `No client contact found for contact_id ${contactId}` });
        continue;
      }
      requestId = created.request_id;
      action = 'created';
    }

    if (item.response) {
      const existing = await ClientFeedbackRequests.getById(projectId, requestId);
      if (!existing) {
        results.push({ request_id: requestId, error: 'Feedback request not found' });
        continue;
      }
      const status = feedbackRequestStatus(existing);
      if (status === 'responded') {
        results.push({ request_id: requestId, action: action ? `${action}_already_responded` : 'already_responded' });
        continue;
      }
      if (status === 'expired') {
        results.push({ request_id: requestId, error: 'Feedback request has expired' });
        continue;
      }
      await ClientFeedbackRequests.submitResponse(requestId, item.response);
      action = action === 'created' ? 'created_and_responded' : 'responded';
    }

    results.push({ request_id: requestId, action: action ?? 'no_op' });
  }

  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'client_feedback_request',
    entity_id: projectId,
    action: 'client_feedback.sync',
    after_json: JSON.stringify(feedback),
    reason: 'Client feedback synced via QStash',
  });

  return results;
}
