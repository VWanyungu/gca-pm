import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pdm_stage', (table) => {
    table.smallint('stage_no').primary();
    table.smallint('phase_id').notNullable().references('phase_id').inTable('pdm_phase');
    table.string('name').notNullable().unique();
    table.check('stage_no BETWEEN 1 AND 10', [], 'pdm_stage_stage_no_check');
    table.index(['phase_id'], 'ix_pdm_stage_phase');
  });

  await knex('pdm_stage')
    .insert([
      { stage_no: 1, phase_id: 1, name: 'Concept Development' },
      { stage_no: 2, phase_id: 1, name: 'Detailed Feasibility' },
      { stage_no: 3, phase_id: 1, name: 'Structuring & Financing' },
      { stage_no: 4, phase_id: 2, name: 'Planning, Monitoring & Controls (PMC)' },
      { stage_no: 5, phase_id: 2, name: 'Design Development' },
      { stage_no: 6, phase_id: 2, name: 'Procurement' },
      { stage_no: 7, phase_id: 2, name: 'Construction & Installation' },
      { stage_no: 8, phase_id: 3, name: 'Commissioning & Handover' },
      { stage_no: 9, phase_id: 3, name: 'Operations & Maintenance' },
      { stage_no: 10, phase_id: 3, name: 'Decommissioning' },
    ])
    .onConflict('stage_no')
    .ignore();
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pdm_stage');
}
