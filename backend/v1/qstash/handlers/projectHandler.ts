import db from '../../database/dbSetup.js';
import { Projects } from '../../database/utils/database.js';
import type { ProjectSyncPayload, QStashEventEnvelope } from '../types.js';
import { resolveProject } from './projectResolver.js';
import { applyProjectMetrics } from './metricsHandler.js';
import { applyProjectStages, applyStageActivities } from './stageHandler.js';
import {
  applyProjectTeam,
  applyProjectContractors,
  applyClientContacts,
} from './teamHandler.js';
import { applyProjectMilestones } from './milestoneHandler.js';
import { applyClientFeedback } from './clientFeedbackHandler.js';

const SYSTEM_ACTOR_ID = '00000000-0000-0000-0000-000000000000';

export async function handleProjectSync(envelope: QStashEventEnvelope<ProjectSyncPayload>) {
  const project = await resolveProject(envelope.project);
  const data = envelope.data;
  const projectId = project.project_id;
  const correlationId = envelope.event_id;

  const result: Record<string, any> = {
    project_id: projectId,
    project_code: project.project_code,
  };

  // 1. Core metadata fields
  const corePatch: Record<string, any> = {};
  if (data.name !== undefined) corePatch.name = data.name;
  if (data.program_id !== undefined) corePatch.program_id = data.program_id;
  if (data.client_name !== undefined) corePatch.client_name = data.client_name;
  if (data.site_location !== undefined) corePatch.site_location = data.site_location;
  if (data.site_lat !== undefined) corePatch.site_lat = data.site_lat;
  if (data.site_lng !== undefined) corePatch.site_lng = data.site_lng;
  if (data.country !== undefined) corePatch.country = data.country;
  if (data.timezone !== undefined) corePatch.timezone = data.timezone;
  if (data.is_civil !== undefined) corePatch.is_civil = data.is_civil;
  if (data.is_mechanical !== undefined) corePatch.is_mechanical = data.is_mechanical;
  if (data.is_electrical !== undefined) corePatch.is_electrical = data.is_electrical;
  if (data.expected_start_date !== undefined) corePatch.expected_start_date = data.expected_start_date;
  if (data.expected_end_date !== undefined) corePatch.expected_end_date = data.expected_end_date;
  if (data.estimated_value !== undefined) corePatch.estimated_value = data.estimated_value;
  if (data.currency !== undefined) corePatch.currency = data.currency;
  if (data.holiday_calendar_id !== undefined) corePatch.holiday_calendar_id = data.holiday_calendar_id;
  if (data.dpr_expected_weekdays !== undefined) corePatch.dpr_expected_weekdays = data.dpr_expected_weekdays;
  if (data.banner_photos !== undefined) corePatch.banner_photos = data.banner_photos;

  if (data.status !== undefined) {
    corePatch.status = data.status;
  }

  if (Object.keys(corePatch).length > 0) {
    const updated = await Projects.update(
      projectId,
      corePatch,
      SYSTEM_ACTOR_ID,
      data.status_change_reason ?? 'Synced via QStash webhook',
    );
    result.core_updated = Object.keys(corePatch);
    result.status = updated?.status ?? data.status ?? project.status;
  }

  // 2. Actual percentage done & metrics
  if (data.actual_pct !== undefined || data.planned_pct !== undefined) {
    result.metrics = await applyProjectMetrics(
      projectId,
      {
        actual_pct: data.actual_pct ?? 0,
        planned_pct: data.planned_pct,
        spi: data.spi,
        rag: data.rag,
        forecast_finish: data.forecast_finish,
        baseline_finish: data.baseline_finish,
        as_of_date: data.as_of_date,
      },
      correlationId,
      project,
    );
  }

  // 3. PDM Stages
  if (data.stages && data.stages.length > 0) {
    result.stages = await applyProjectStages(projectId, data.stages, correlationId);
  }

  // 3b. Kickoff/Closure gate activities
  if (data.activities && data.activities.length > 0) {
    result.activities = await applyStageActivities(projectId, data.activities, correlationId);
  }

  // 4. Team & Roles
  if (data.team) {
    result.team = await applyProjectTeam(projectId, data.team, correlationId);
  }

  // 5. Contractors
  if (data.contractors && data.contractors.length > 0) {
    result.contractors = await applyProjectContractors(projectId, data.contractors, correlationId);
  }

  // 6. Client Contacts
  if (data.client_contacts && data.client_contacts.length > 0) {
    result.client_contacts = await applyClientContacts(projectId, data.client_contacts, correlationId);
  }

  // 7. Custom Milestones
  if (data.milestones && data.milestones.length > 0) {
    result.milestones = await applyProjectMilestones(projectId, data.milestones, correlationId);
  }

  // 8. Client Feedback
  if (data.feedback && data.feedback.length > 0) {
    result.feedback = await applyClientFeedback(projectId, data.feedback, correlationId);
  }

  // Audit overall sync
  await db('audit_event').insert({
    occurred_at: new Date(),
    actor_id: SYSTEM_ACTOR_ID,
    channel: 'qstash_webhook',
    correlation_id: correlationId,
    project_id: projectId,
    entity_type: 'project',
    entity_id: projectId,
    action: 'project.sync_all',
    after_json: JSON.stringify(result),
    reason: 'Comprehensive project sync via QStash',
  });

  return result;
}
