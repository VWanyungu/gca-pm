import type { Knex } from 'knex';

const USER_IDS = {
  ADMIN: '10000000-0000-0000-0000-000000000001',
  PM: '10000000-0000-0000-0000-000000000004',
};

const PROJECT_ID = '20000000-0000-0000-0000-000000000001';
const SUBMISSION_ID = '54000000-0000-0000-0000-000000000003';
const NOTIFICATION_ID = '55000000-0000-0000-0000-000000000001';
const OVERDUE_RISK_NOTIFICATION_ID = '55000000-0000-0000-0000-000000000004';
const DPR_MISSING_NOTIFICATION_ID = '55000000-0000-0000-0000-000000000005';
const AUDIT_CORRELATION_ID = '55000000-0000-0000-0000-000000000002';

export async function seed(knex: Knex): Promise<void> {
  await knex('notification')
    .insert({
      notification_id: NOTIFICATION_ID,
      recipient_id: USER_IDS.PM,
      type_code: 'weekly_submission_approved',
      project_id: PROJECT_ID,
      entity_type: 'weekly_submission',
      entity_id: SUBMISSION_ID,
      title: 'Weekly submission approved',
      body: 'The weekly update for the Mombasa LPG terminal was approved.',
      payload: { submission_id: SUBMISSION_ID, project_id: PROJECT_ID },
      in_app: true,
      dedupe_key: `seed:${SUBMISSION_ID}:approved`,
      created_at: '2026-10-16T08:11:00Z',
    })
    .onConflict('notification_id')
    .merge([
      'recipient_id',
      'type_code',
      'project_id',
      'entity_type',
      'entity_id',
      'title',
      'body',
      'payload',
      'in_app',
      'dedupe_key',
      'created_at',
    ]);

  await knex('notification')
    .insert({
      notification_id: OVERDUE_RISK_NOTIFICATION_ID,
      recipient_id: USER_IDS.PM,
      type_code: 'task_overdue_risk',
      project_id: PROJECT_ID,
      entity_type: 'schedule_task',
      entity_id: null,
      title: 'New overdue task risk',
      body: "Trench excavation, Zone B passed its expected finish (3 Oct) at 68%. Address it before Monday's submission.",
      payload: { project_id: PROJECT_ID },
      in_app: true,
      dedupe_key: 'seed:task_overdue_risk:zone-b-trench',
      created_at: '2026-10-16T08:40:00Z',
    })
    .onConflict('notification_id')
    .merge(['recipient_id', 'type_code', 'project_id', 'entity_type', 'entity_id', 'title', 'body', 'payload', 'in_app', 'dedupe_key', 'created_at']);

  await knex('notification')
    .insert({
      notification_id: DPR_MISSING_NOTIFICATION_ID,
      recipient_id: USER_IDS.PM,
      type_code: 'dpr_missing',
      project_id: PROJECT_ID,
      entity_type: 'dpr',
      entity_id: null,
      title: 'DPR missing',
      body: 'No DPR was submitted for Gitanga Mall, Block C by 23:00.',
      payload: { project_id: PROJECT_ID },
      in_app: true,
      dedupe_key: 'seed:dpr_missing:block-c',
      created_at: '2026-10-15T23:00:00Z',
      read_at: '2026-10-16T07:00:00Z',
    })
    .onConflict('notification_id')
    .merge(['recipient_id', 'type_code', 'project_id', 'entity_type', 'entity_id', 'title', 'body', 'payload', 'in_app', 'dedupe_key', 'created_at', 'read_at']);

  await knex('notification_delivery')
    .insert({
      delivery_id: '55000000-0000-0000-0000-000000000003',
      notification_id: NOTIFICATION_ID,
      channel: 'email',
      status: 'sent',
      attempts: 1,
      provider_message_id: 'seed-notification-2026-10-13',
      sent_at: '2026-10-13T08:01:00Z',
    })
    .onConflict('delivery_id')
    .merge([
      'notification_id',
      'channel',
      'status',
      'attempts',
      'last_error',
      'provider_message_id',
      'sent_at',
    ]);

  await knex('notification_preference')
    .insert([
      {
        user_id: USER_IDS.PM,
        type_code: 'weekly_submission_approved',
        channel: 'in_app',
        enabled: true,
      },
      {
        user_id: USER_IDS.PM,
        type_code: 'weekly_submission_approved',
        channel: 'email',
        enabled: true,
      },
      {
        user_id: USER_IDS.ADMIN,
        type_code: 'risk_escalated',
        channel: 'in_app',
        enabled: true,
      },
    ])
    .onConflict(['user_id', 'type_code', 'channel'])
    .merge(['enabled', 'updated_at']);

  const auditEvent = await knex('audit_event')
    .select('event_id')
    .where({ correlation_id: AUDIT_CORRELATION_ID })
    .first();
  if (!auditEvent) {
    await knex('audit_event').insert({
      occurred_at: '2026-10-13T08:00:00Z',
      actor_id: USER_IDS.ADMIN,
      acting_attribute_id: '30000000-0000-0000-0000-000000000001',
      channel: 'admin_console',
      correlation_id: AUDIT_CORRELATION_ID,
      project_id: PROJECT_ID,
      entity_type: 'weekly_submission',
      entity_id: SUBMISSION_ID,
      action: 'submission.approved',
      before_json: { status: 'draft' },
      after_json: { status: 'approved' },
      reason: 'Seed fixture audit event.',
      ip_address: '127.0.0.1',
    });
  }

  await knex('refreshTokens')
    .insert({
      user_id: USER_IDS.PM,
      refresh_token: 'seed-only-invalid-refresh-token',
      created_at: '2026-10-13T08:00:00Z',
    })
    .onConflict('refresh_token')
    .ignore();

  await knex('tokens')
    .insert({
      token: 'seed-only-invalid-blacklisted-token',
      created_at: '2026-10-13T08:00:00Z',
    })
    .onConflict('token')
    .ignore();
}
