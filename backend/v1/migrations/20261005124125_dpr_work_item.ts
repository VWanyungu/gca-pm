import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr_work_item', (table) => {
    table.uuid('work_item_id').primary();
    table
      .uuid('dpr_id')
      .notNullable()
      .references('dpr_id')
      .inTable('dpr')
      .onDelete('CASCADE');
    table.smallint('sort_order').notNullable();
    table.string('work_area', 500).notNullable();
    table.string('work_carried_out', 10000).notNullable();

    table.index(['dpr_id', 'sort_order'], 'ix_dpr_work_item_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dpr_work_item');
}
