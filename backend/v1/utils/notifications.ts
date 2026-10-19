import { randomUUID } from 'crypto';
import db from '../database/dbSetup.js';

/**
 * Creates notifications and resolves their channels (AC-NTF-01, AC-NTF-02). Shared by every
 * feature that notifies: schedule uploads, DPR reminders, escalations, weekly submissions.
 *
 * Callers invoke this *after* the triggering transaction commits, so a notification never
 * describes something that was rolled back.
 */

/** AC-GEN-07: automated work acts as the seeded system user, which never gets notified. */
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000000';

export interface NotificationInput {
  typeCode: string;
  recipientIds: string[];
  projectId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  title: string;
  body: string;
  payload?: Record<string, unknown>;
  /** AC-NTF-03: set for anything a repeating job can emit twice. */
  dedupeKey?: string | null;
}

/** Returns how many notifications were actually created (deduped ones do not count). */
export async function notify(input: NotificationInput): Promise<number> {
  const recipients = [...new Set(input.recipientIds)].filter(
    (id) => id && id !== SYSTEM_USER_ID,
  );
  if (recipients.length === 0) {
    return 0;
  }

  const type = await db('notification_type').where({ type_code: input.typeCode }).first();
  if (!type) {
    throw new Error(`Unknown notification type: ${input.typeCode}`);
  }

  const preferences = type.can_opt_out
    ? await db('notification_preference')
        .whereIn('user_id', recipients)
        .andWhere({ type_code: input.typeCode })
        .select('user_id', 'channel', 'enabled')
    : [];
  const preferenceFor = (userId: string, channel: 'in_app' | 'email'): boolean | undefined =>
    preferences.find((p) => p.user_id === userId && p.channel === channel)?.enabled;

  let created = 0;
  for (const recipientId of recipients) {
    // AC-NTF-02: a locked type ignores preferences entirely and uses the type defaults.
    const inApp = type.can_opt_out
      ? (preferenceFor(recipientId, 'in_app') ?? type.default_in_app)
      : type.default_in_app;
    const email = type.can_opt_out
      ? (preferenceFor(recipientId, 'email') ?? type.default_email)
      : type.default_email;

    const notificationId = randomUUID();
    try {
      await db.transaction(async (trx) => {
        await trx('notification').insert({
          notification_id: notificationId,
          recipient_id: recipientId,
          type_code: input.typeCode,
          project_id: input.projectId ?? null,
          entity_type: input.entityType ?? null,
          entity_id: input.entityId ?? null,
          title: input.title,
          body: input.body,
          payload: JSON.stringify(input.payload ?? {}),
          in_app: inApp,
          dedupe_key: input.dedupeKey ?? null,
        });

        // The email job (AC-NTF-05) picks up `pending`; `suppressed` records that we
        // deliberately did not send, which is not the same as never having tried.
        await trx('notification_delivery').insert({
          delivery_id: randomUUID(),
          notification_id: notificationId,
          channel: 'email',
          status: email ? 'pending' : 'suppressed',
          attempts: 0,
        });
      });
      created += 1;
    } catch (err) {
      // AC-NTF-03: a duplicate dedupe_key means this alert already went out.
      if ((err as { code?: string }).code === '23505' && input.dedupeKey) {
        continue;
      }
      throw err;
    }
  }

  return created;
}

/** Current PMs of a project, earliest grant first. AC-IAM-05 intends one, but the schema does
 *  not enforce it, so callers that need a single owner take the first and the rest still get
 *  told what happened. */
export async function projectManagers(projectId: string): Promise<string[]> {
  const rows = await db('roles')
    .where({ project_id: projectId, role: 'PM', scope_type: 'project' })
    .whereNull('revoked_at')
    .orderBy('granted_at', 'asc')
    .select('user_id');
  return [...new Set(rows.map((r) => r.user_id))];
}

/** AC-NTF-01: committee events fan out to every current ExCo. */
export async function executives(): Promise<string[]> {
  const rows = await db('roles')
    .where({ role: 'ExCo', scope_type: 'global' })
    .whereNull('revoked_at')
    .select('user_id');
  return [...new Set(rows.map((r) => r.user_id))];
}
