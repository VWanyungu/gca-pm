import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stage_activity_attachment', (table) => {
    table.string('attachment_id', 1000).alter();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stage_activity_attachment', (table) => {
    table.uuid('attachment_id').alter();
  });
}
