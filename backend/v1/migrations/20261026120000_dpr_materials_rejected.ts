import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dpr', (table) => {
    table.string('materials_rejected_text', 10000);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('dpr', (table) => {
    table.dropColumn('materials_rejected_text');
  });
}
