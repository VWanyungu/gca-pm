import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('project_calendar_exception', (table) => {
    table
      .uuid('project_id')
      .notNullable()
      .references('project_id')
      .inTable('projects')
      .onDelete('CASCADE');
    table.date('exception_date').notNullable();
    table.boolean('is_working_day').notNullable();
    table.string('reason', 10000).notNullable();
    table.uuid('created_by').notNullable().references('id').inTable('users');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.primary(['project_id', 'exception_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_calendar_exception');
}
