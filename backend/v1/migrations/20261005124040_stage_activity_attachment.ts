import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stage_activity_attachment', (table) => {
    table.uuid('attachment_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('activity_id').notNullable().references('activity_id').inTable('stage_activity');
    table.uuid('file_id').notNullable().unique();
    table.text('caption');
    table.smallint('sort_order').notNullable().defaultTo(0);
    table.uuid('uploaded_by').notNullable().references('id').inTable('users');
    table.timestamp('uploaded_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('removed_by').references('id').inTable('users');
    table.timestamp('removed_at', { useTz: true });

    table.check(
      '(removed_at IS NULL) = (removed_by IS NULL)',
      [],
      'ck_attachment_removed_pair',
    );
    table.index(['activity_id', 'sort_order'], 'ix_attachment_activity', {
      predicate: knex.whereNull('removed_at'),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('stage_activity_attachment');
}
