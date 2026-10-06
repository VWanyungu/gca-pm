import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('schedule_task', (table) => {
    table.uuid('task_id').primary();
    table.uuid('project_id').notNullable().references('project_id').inTable('projects');
    table.integer('mpp_unique_id').notNullable();
    table
      .uuid('first_seen_version_id')
      .notNullable()
      .references('schedule_version_id')
      .inTable('schedule_version');
    table
      .uuid('removed_in_version_id')
      .references('schedule_version_id')
      .inTable('schedule_version');

    table.unique(['project_id', 'mpp_unique_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schedule_task');
}
