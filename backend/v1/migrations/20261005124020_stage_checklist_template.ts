import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stage_checklist_template', (table) => {
    table.uuid('template_id').primary();
    table.smallint('stage_no').notNullable().references('stage_no').inTable('pdm_stage');
    table.integer('version_no').notNullable();
    table.boolean('is_current').notNullable().defaultTo(false);
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check('version_no > 0', [], 'stage_checklist_template_version_no_check');
    table.unique(['stage_no', 'version_no']);
    table.unique(['template_id', 'stage_no']);
    table.index(['stage_no'], 'ux_checklist_template_current', {
      predicate: knex.where('is_current', true),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('stage_checklist_template');
}
