import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stage_activity', (table) => {
    table.uuid('template_id').references('template_id').inTable('pdm_gate_activity_template');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('stage_activity', (table) => {
    table.dropColumn('template_id');
  });
}
