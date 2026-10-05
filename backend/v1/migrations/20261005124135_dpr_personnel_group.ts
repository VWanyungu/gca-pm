import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr_personnel_group', (table) => {
    table.uuid('personnel_group_id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('dpr_id')
      .notNullable()
      .references('dpr_id')
      .inTable('dpr')
      .onDelete('CASCADE');
    table
      .uuid('project_contractor_id')
      .notNullable()
      .references('project_contractor_id')
      .inTable('project_contractor');
    table.smallint('sort_order').notNullable();
    table.integer('total_headcount').notNullable();

    table.check('total_headcount >= 0', [], 'ck_dpg_headcount_nonneg');
    table.unique(['dpr_id', 'project_contractor_id']);
    table.index(['dpr_id', 'sort_order'], 'ix_dpg_order');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dpr_personnel_group');
}
