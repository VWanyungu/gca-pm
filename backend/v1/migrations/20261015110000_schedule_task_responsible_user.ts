import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('schedule_task_revision', (table) => {
    table.uuid('responsible_user_id').references('id').inTable('users');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('schedule_task_revision', (table) => {
    table.dropColumn('responsible_user_id');
  });
}
