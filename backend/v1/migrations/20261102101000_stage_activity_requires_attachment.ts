import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stage_activity', (table) => {
    table.boolean('requires_attachment').notNullable().defaultTo(false);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stage_activity', (table) => {
    table.dropColumn('requires_attachment');
  });
}
