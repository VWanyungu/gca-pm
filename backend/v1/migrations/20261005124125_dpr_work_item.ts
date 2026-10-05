import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr_work_item', (table) => {
    table.uuid('work_item_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('dpr_id')
      .notNullable()
      .references('dpr_id')
      .inTable('dpr')
      .onDelete('CASCADE');
    table.smallint('sort_order').notNullable();
    table.text('work_area').notNullable();
    table.text('work_carried_out').notNullable();

    table.index(['dpr_id', 'sort_order'], 'ix_dpr_work_item_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dpr_work_item');
}
