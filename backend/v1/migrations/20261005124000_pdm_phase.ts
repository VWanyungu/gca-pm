import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pdm_phase', (table) => {
    table.smallint('phase_id').primary();
    table.text('code').notNullable().unique();
    table.text('name').notNullable().unique();
    table.smallint('sort_order').notNullable().unique();
  });

  await knex('pdm_phase')
    .insert([
      { phase_id: 1, code: 'develop', name: 'Develop', sort_order: 1 },
      { phase_id: 2, code: 'deliver', name: 'Deliver', sort_order: 2 },
      { phase_id: 3, code: 'sustain', name: 'Sustain', sort_order: 3 },
    ])
    .onConflict('phase_id')
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pdm_phase');
}
