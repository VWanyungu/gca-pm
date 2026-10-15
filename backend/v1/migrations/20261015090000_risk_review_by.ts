import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('risk', (table) => {
    table.date('review_by');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('risk', (table) => {
    table.dropColumn('review_by');
  });
}
