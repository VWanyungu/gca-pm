import type { Knex } from 'knex';

const DELIVERY_CHANNEL = ['email'] as const;
const DELIVERY_STATUS = ['pending', 'sent', 'failed', 'suppressed'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification_delivery', (table) => {
    table.uuid('delivery_id').primary();
    table
      .uuid('notification_id')
      .notNullable()
      .references('notification_id')
      .inTable('notification')
      .onDelete('CASCADE');
    table
      .enu('channel', [...DELIVERY_CHANNEL], {
        useNative: true,
        enumName: 'notification_delivery_channel',
      })
      .notNullable();
    table
      .enu('status', [...DELIVERY_STATUS], {
        useNative: true,
        enumName: 'notification_delivery_status',
      })
      .notNullable();
    table.smallint('attempts').notNullable().defaultTo(0);
    table.string('last_error', 10000);
    table.string('provider_message_id');
    table.timestamp('sent_at', { useTz: true });

    table.check(
      "(status = 'sent') = (sent_at IS NOT NULL)",
      [],
      'ck_nd_sent_at_when_sent',
    );
    table.check(
      "status <> 'failed' OR last_error IS NOT NULL",
      [],
      'ck_nd_last_error_when_failed',
    );

    table.index(['status', 'notification_id'], 'ix_nd_pending', {
      predicate: knex.queryBuilder().whereRaw('"status" = \'pending\''),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_delivery');
  for (const t of ['notification_delivery_status', 'notification_delivery_channel']) {
    await knex.raw(`DROP TYPE IF EXISTS ??`, [t]);
  }
}
