import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Needed as the target of the composite FK below (task_id alone is already PK).
  await knex.schema.alterTable('schedule_task', (table) => {
    table.unique(['task_id', 'project_id'], { indexName: 'uq_schedule_task_task_project' });
  });

  await knex.schema.createTable('schedule_reconciliation_flag', (table) => {
    table.uuid('flag_id').primary();
    table.uuid('project_id').notNullable();
    table.uuid('task_id').notNullable();

    table
      .uuid('overwritten_revision_id')
      .notNullable()
      .references('revision_id')
      .inTable('schedule_task_revision');
    table
      .uuid('overwriting_revision_id')
      .notNullable()
      .unique()
      .references('revision_id')
      .inTable('schedule_task_revision');

    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.uuid('acknowledged_by').references('id').inTable('users');
    table.timestamp('acknowledged_at', { useTz: true });

    table
      .foreign(['task_id', 'project_id'])
      .references(['task_id', 'project_id'])
      .inTable('schedule_task');

    table.check(
      '(acknowledged_at IS NULL) = (acknowledged_by IS NULL)',
      [],
      'ck_srf_ack_pair',
    );

    table.index(['project_id'], 'ix_srf_project');
    table.index(['project_id'], 'ix_srf_unacknowledged', {
      predicate: knex.whereNull('acknowledged_at'),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('schedule_reconciliation_flag');
  await knex.schema.alterTable('schedule_task', (table) => {
    table.dropUnique(['task_id', 'project_id'], 'uq_schedule_task_task_project');
  });
}
