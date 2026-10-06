import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('stage_checklist_item', (table) => {
    table.uuid('item_id').primary();
    table.uuid('template_id').notNullable();
    table.smallint('stage_no').notNullable();
    table.smallint('sort_order').notNullable();
    table.string('text', 10000).notNullable();

    table
      .foreign(['template_id', 'stage_no'])
      .references(['template_id', 'stage_no'])
      .inTable('stage_checklist_template');
    table.unique(['item_id', 'stage_no']);
    table.index(['template_id', 'sort_order'], 'ix_checklist_item_template');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('stage_checklist_item');
}
