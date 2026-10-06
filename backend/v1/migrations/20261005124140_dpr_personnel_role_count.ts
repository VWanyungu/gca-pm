import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('dpr_personnel_role_count', (table) => {
    table
      .uuid('personnel_group_id')
      .notNullable()
      .references('personnel_group_id')
      .inTable('dpr_personnel_group')
      .onDelete('CASCADE');
    // FK added in 20261005124240 (personnel_role) once that table exists.
    table.smallint('personnel_role_id').notNullable();
    table.integer('headcount').notNullable();

    table.primary(['personnel_group_id', 'personnel_role_id']);
    table.check('headcount > 0', [], 'ck_dprc_headcount_positive');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('dpr_personnel_role_count');
}
