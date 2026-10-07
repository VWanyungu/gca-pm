import type { Knex } from 'knex';

const ESCALATION_STATUS = ['open', 'acknowledged', 'resolved', 'voided'] as const;

export async function up(knex: Knex): Promise<void> {
  // Needed as the target of the composite FK below (submission_id alone is already PK).
  await knex.schema.alterTable('weekly_submission', (table) => {
    table.unique(['submission_id', 'project_id'], {
      indexName: 'uq_ws_submission_project',
    });
  });

  await knex.schema.createTable('escalation', (table) => {
    table.uuid('escalation_id').primary();
    table.uuid('submission_id').notNullable().unique();
    table.uuid('project_id').notNullable();
    table
      .enu('status', [...ESCALATION_STATUS], { useNative: true, enumName: 'escalation_status' })
      .notNullable();
    table.uuid('acknowledged_by').references('id').inTable('users');
    table.timestamp('acknowledged_at', { useTz: true });
    table.uuid('resolved_by').references('id').inTable('users');
    table.timestamp('resolved_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table
      .foreign(['submission_id', 'project_id'])
      .references(['submission_id', 'project_id'])
      .inTable('weekly_submission');

    table.check(
      '(acknowledged_at IS NULL) = (acknowledged_by IS NULL)',
      [],
      'ck_esc_ack_pair',
    );
    table.check(
      '(resolved_at IS NULL) = (resolved_by IS NULL)',
      [],
      'ck_esc_resolved_pair',
    );

    table.index(['project_id'], 'ix_esc_project');
    table.index(['status'], 'ix_esc_open', {
      predicate: knex.queryBuilder().whereRaw('"status" = \'open\''),
    });
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('escalation');
  await knex.schema.alterTable('weekly_submission', (table) => {
    table.dropUnique(['submission_id', 'project_id'], 'uq_ws_submission_project');
  });
  await knex.raw(`DROP TYPE IF EXISTS escalation_status`);
}
