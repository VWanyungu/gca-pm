import type { Knex } from 'knex';

/**
 * MS Project lets a planner deactivate a task: it stays in the file as a record of work that
 * was cancelled, but it is no longer part of the plan. Without somewhere to put the flag we
 * would import cancelled work as live tasks, which would then raise overdue risks against it
 * (AC-SCH-20). Existing rows all came from files we parsed as active.
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('schedule_task_revision', (table) => {
    table.boolean('is_active').notNullable().defaultTo(true);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('schedule_task_revision', (table) => {
    table.dropColumn('is_active');
  });
}
