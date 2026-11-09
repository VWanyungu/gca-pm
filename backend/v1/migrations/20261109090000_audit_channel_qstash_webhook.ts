import type { Knex } from 'knex';

/**
 * Every QStash sync handler writes audit_event with channel 'qstash_webhook', but that
 * value was never added to the audit_channel enum — every webhook sync's audit insert
 * fails with "invalid input value for enum audit_channel", even though the underlying
 * mutation (already committed in its own transaction) stands.
 */
// Must commit on its own: Postgres forbids using a new enum value added by
// ALTER TYPE ... ADD VALUE within the same transaction that added it.
export const config = { transaction: false };

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`ALTER TYPE audit_channel ADD VALUE 'qstash_webhook'`);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('ALTER TYPE audit_channel RENAME TO audit_channel_old');
  await knex.raw(
    `CREATE TYPE audit_channel AS ENUM ('web', 'mobile', 'schedule_service', 'scheduled_job', 'admin_console')`,
  );
  await knex.raw(`
    ALTER TABLE audit_event
      ALTER COLUMN channel TYPE audit_channel
      USING (
        CASE WHEN channel::text = 'qstash_webhook' THEN 'web' ELSE channel::text END
      )::audit_channel
  `);
  await knex.raw('DROP TYPE audit_channel_old');
}
