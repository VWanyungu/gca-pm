import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notification', (table) => {
    table.uuid('notification_id').primary();
    table.uuid('recipient_id').notNullable().references('id').inTable('users');
    table.string('type_code').notNullable().references('type_code').inTable('notification_type');
    table.uuid('project_id').references('project_id').inTable('projects');
    table.string('entity_type');
    table.string('entity_id');
    table.string('title', 500).notNullable();
    table.string('body', 10000).notNullable();
    table.jsonb('payload').notNullable().defaultTo(knex.raw(`'{}'::jsonb`));
    table.boolean('in_app').notNullable();
    table.string('dedupe_key');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('read_at', { useTz: true });

    table.unique(['recipient_id', 'dedupe_key'], {
      indexName: 'ux_notification_dedupe',
      predicate: knex.whereNotNull('dedupe_key'),
    });
    table.index(['recipient_id', 'created_at'], 'ix_notification_recipient_time');
    table.index(['recipient_id'], 'ix_notification_unread', {
      predicate: knex.queryBuilder().whereRaw('"read_at" IS NULL AND "in_app" = true'),
    });
    table.index(['project_id', 'created_at'], 'ix_notification_project_time', {
      predicate: knex.whereNotNull('project_id'),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification');
}
