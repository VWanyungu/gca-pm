import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_stage_checklist_response', (table) => {
    table.uuid('project_id').notNullable();
    table.smallint('stage_no').notNullable();
    table.uuid('item_id').notNullable();
    table.boolean('is_checked').notNullable().defaultTo(false);
    table.text('note');
    table.uuid('updated_by').notNullable().references('id').inTable('users');
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['project_id', 'stage_no', 'item_id']);
    table
      .foreign(['project_id', 'stage_no'])
      .references(['project_id', 'stage_no'])
      .inTable('project_stage');
    table
      .foreign(['item_id', 'stage_no'])
      .references(['item_id', 'stage_no'])
      .inTable('stage_checklist_item');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_stage_checklist_response');
}
